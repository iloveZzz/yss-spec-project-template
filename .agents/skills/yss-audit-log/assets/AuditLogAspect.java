package com.yss.cloud.audit.configuration;

import cn.hutool.jwt.JWT;
import cn.hutool.jwt.JWTUtil;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.yss.cloud.audit.AuditLog;
import com.yss.cloud.audit.subscriber.YssAuditPublishService;
import com.yss.cloud.dto.audit.message.AuditMessage;
import com.yss.cloud.dto.audit.message.AuditResourceType;
import com.yss.cloud.dto.audit.message.EventMessage;
import com.yss.cloud.dto.user.UserInfo;
import com.yss.cloud.user.AuthUserInfoUtil;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.Signature;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cglib.beans.BeanMap;
import org.springframework.context.expression.EnvironmentAccessor;
import org.springframework.context.expression.MapAccessor;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.ParserContext;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.InputStream;
import java.net.NetworkInterface;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Aspect
@Slf4j
public class AuditLogAspect {
    public static final String USER_AGENT = "User-Agent";
    /**
     * 引用来源
     */
    public static final String REFERER = "Referer";
    public static final String UNKNOWN = "unknown";
    private static final ExpressionParser parser = new SpelExpressionParser();
    /**
     * 正则表达式，匹配 #{xxx} 格式的变量表达式
     */
    private static final Pattern varPattern = Pattern.compile("#\\{[a-zA-Z0-9_\\[\\]\\?\\.]+\\}");
    @Autowired
    private YssAuditPublishService yssAuditPublishService;
    private static final ObjectMapper OM = new ObjectMapper();
    static {
        OM.registerModule(new JavaTimeModule());
        OM.setSerializationInclusion(JsonInclude.Include.NON_NULL);
    }
    private static boolean containsPattern(String text) {
        Matcher matcher = varPattern.matcher(text);
        return matcher.find();
    }

    private static String getMacAddr() {
        try {
            Enumeration<NetworkInterface> networkInterfaces = NetworkInterface.getNetworkInterfaces();
            while (networkInterfaces.hasMoreElements()) {
                NetworkInterface networkInterface = networkInterfaces.nextElement();
                if (networkInterface.getName().startsWith("en")) {
                    byte[] macAddress = networkInterface.getHardwareAddress();
                    if (macAddress != null) {
                        StringJoiner macAddressBuilder = new StringJoiner("-");
                        for (byte b : macAddress) {
                            macAddressBuilder.add(String.format("%02X", b));
                        }
                        return macAddressBuilder.toString();
                    }
                }
            }
        } catch (Exception e) {
            return "";
        }
        return "";
    }

    @SneakyThrows
    @AfterReturning(value = "@annotation(com.yss.cloud.audit.AuditLog)&&execution(public * *(..))", returning = "result")
    public void logAudit(JoinPoint joinPoint, Object result) {
        Signature signature = joinPoint.getSignature();

        AuditMessage.AuditMessageBuilder builder = AuditMessage.builder();
        Map<String, Object> referencedResources = new HashMap<>();

        Class<?> declaringType = signature.getDeclaringType();
        if (signature instanceof MethodSignature) {
            AuditLog audit = ((MethodSignature) signature).getMethod().getAnnotation(AuditLog.class);
            if (audit.isNeedArgs()) {
                referencedResources.put("参数审计", buildLogArgsDetails(joinPoint));
            }
            if (audit.isNeedResult()) {
                referencedResources.put("结果审计", result);
            }
            String summary = StringUtils.hasLength(audit.value()) ? audit.value() : audit.summary();

            boolean containsVariableExpression = containsPattern(summary);

            if (containsVariableExpression) {
                log.info("文本中包含变量表达式。");
                StandardEvaluationContext context = new StandardEvaluationContext(referencedResources);
                context.addPropertyAccessor(new MapAccessor());
                context.addPropertyAccessor(new EnvironmentAccessor());
                try {
                    Expression expression = parser.parseExpression(summary, ParserContext.TEMPLATE_EXPRESSION);
                    summary = expression.getValue(context, String.class);
                } catch (Exception e) {
                    log.warn(e.getLocalizedMessage());
                }

            }

            builder.operation(Objects.isNull(audit.operation())
                            ? signature.getName()
                            : audit.operation().getOperationType())
                    .content(summary)
                    .resourceType(audit.resource().getResourceType());
        }

        EventMessage.EventMessageBuilder eventMessageBuilder = EventMessage.builder()
                .eventId(UUIDGenerator.generateUUID())
                .serviceName(declaringType.getName())
                .eventTime(LocalDateTime.now())
                .userIdentity(AuthUserInfoUtil.currentUserJson())
                .macAddr(getMacAddr());
        if (result instanceof Principal){
            //登录情况获取用户信息
            BeanMap beanMap = BeanMap.create(result);
            Object additionalParameters = beanMap.get("additionalParameters");
            if (Objects.nonNull(additionalParameters)){
                Map<String,String> additionalParametersMap = (Map<String,String>)additionalParameters;
                log.info("[登录用户信息] additionalParametersMap=>{}",additionalParametersMap);
                String idToken = additionalParametersMap.get("id_token");
                final JWT jwt = JWTUtil.parseToken(idToken);
                UserInfo userInfo = new UserInfo();
                userInfo.setUserName(String.valueOf(jwt.getPayload("sub")));

                String loginDisplayName = Objects.nonNull(jwt.getPayload("loginDisplayName"))?
                        String.valueOf(jwt.getPayload("loginDisplayName")):
                        String.valueOf(jwt.getPayload("sub"));
                userInfo.setLoginDisplayName(loginDisplayName);
                eventMessageBuilder.userIdentity(OM.writeValueAsString(userInfo));
            }

        }
        try{
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
            String realIp = getIpAddr(request);
            eventMessageBuilder.userAgent(request.getHeader(USER_AGENT))
                    .sourceIpAddress(realIp)
                    .eventName(signature.getName())
                    .requestUrl(request.getRequestURL().toString())
                    .eventSource(Objects.isNull(request.getHeader(REFERER)) ? request.getRequestURL().toString() : request.getHeader(REFERER));
        }catch (Exception e){
            log.warn("非rest请求无法获取客户端ip");
            eventMessageBuilder.userAgent("")
                    .sourceIpAddress("")
                    .eventName(signature.getName())
                    .requestUrl("")
                    .eventSource("");
        }

        AuditMessage auditMessage = builder
                .eventMessage(
                        eventMessageBuilder.build()
                )
                .referencedResources(referencedResources)
                .build();


        auditMessage.setResourceName(AuditResourceType.valueOf(auditMessage.getResourceType()).getResourceName());

        yssAuditPublishService.publish(auditMessage);
    }

    /**
     * 辅助方法，构建日志详情
     *
     * @param joinPoint 参数点
     */
    @SneakyThrows
    private List<Object> buildLogArgsDetails(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        return Arrays.stream(args)
                .filter(arg -> !(arg instanceof ServletRequest || arg instanceof ServletResponse))
                .map(arg -> {
                    if (arg instanceof File) {
                        return ((File) arg).getName();
                    } else if (arg instanceof InputStream) {
                        return "参数为输入流";
                    } else {
                        return arg;
                    }
                })
                .collect(Collectors.toList());
    }

    /**
     * 获取真实ip地址,不返回内网地址
     *
     * @param request 请求对象
     * @return 真实客户ip
     */
    public String getIpAddr(HttpServletRequest request) {
        //目前则是网关ip
        String ip = request.getHeader("X-Forwarded-For");
        if (ip != null && !ip.isEmpty() && !UNKNOWN.equalsIgnoreCase(ip)) {
            return getFirstIpAddr(ip);
        }
        if (ip == null || ip.isEmpty() || UNKNOWN.equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || UNKNOWN.equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || UNKNOWN.equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isEmpty() || UNKNOWN.equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isEmpty() || UNKNOWN.equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }


        return getFirstIpAddr(ip);
    }

    private static String getFirstIpAddr(String ip) {
        if (ip != null && !ip.isEmpty() && !UNKNOWN.equalsIgnoreCase(ip)) {
            int index = ip.indexOf(',');
            if (index != -1) {
                //只获取第一个值
                return ip.substring(0, index);
            } else {
                return ip;
            }
        } else {
            //取不到真实ip则返回空，不能返回内网地址。
            return "";
        }
    }
}
