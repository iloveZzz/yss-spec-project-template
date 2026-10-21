package com.yss.excel.mvc.handler;

import com.yss.excel.mvc.annotation.ResponseExcel;
import com.yss.excel.mvc.model.ExcelDynamicData;
import com.yss.excel.mvc.util.ExcelUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.MethodParameter;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodReturnValueHandler;
import org.springframework.web.method.support.ModelAndViewContainer;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.net.URLEncoder;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Excel导出返回值处理器
 *
 * @author daomingzhu
 * @date 2024-01-13
 */
@Slf4j
public class ResponseFastExcelReturnValueHandler implements HandlerMethodReturnValueHandler {

    private static final Pattern PARAM_PATTERN = Pattern.compile("\\{([^}]+)\\}");

    @Override
    public boolean supportsReturnType(MethodParameter returnType) {
        return returnType.hasMethodAnnotation(ResponseExcel.class);
    }

    @Override
    public void handleReturnValue(Object returnValue, MethodParameter returnType,
            ModelAndViewContainer mavContainer, NativeWebRequest webRequest) throws Exception {
        mavContainer.setRequestHandled(true);
        HttpServletResponse response = webRequest.getNativeResponse(HttpServletResponse.class);
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        ResponseExcel responseExcel = returnType.getMethodAnnotation(ResponseExcel.class);

        if (response == null) {
            return;
        }

        String fileName = responseExcel.name();
        if (!StringUtils.hasText(fileName)) {
            fileName = "export_" + System.currentTimeMillis();
        } else {
            // 解析文件名中的占位符
            fileName = resolveFileName(fileName, request);
        }

        // 如果返回值是ExcelDynamicData且指定了文件名，则覆盖（支持POST请求动态文件名）
        if (returnValue instanceof ExcelDynamicData) {
            ExcelDynamicData dynamicData = (ExcelDynamicData) returnValue;
            if (StringUtils.hasText(dynamicData.getFileName())) {
                fileName = dynamicData.getFileName();
            }
        }

        String suffix = responseExcel.suffix();
        String fullFileName = fileName + "." + suffix;

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        String encodedFileName = URLEncoder.encode(fullFileName, "UTF-8").replaceAll("\\+", "%20");
        response.setHeader("Content-Disposition",
                "attachment;filename=" + encodedFileName + ";filename*=utf-8''" + encodedFileName);

        if (returnValue == null) {
            return;
        }

        if (returnValue instanceof ExcelDynamicData) {
            ExcelDynamicData dynamicData = (ExcelDynamicData) returnValue;
            ExcelUtils.writeMap(response.getOutputStream(), dynamicData.getColumns(), dynamicData.getColumnCn(),
                    dynamicData.getRows(), responseExcel.sheet());
            return;
        }

        if (returnValue instanceof List) {
            List<?> list = (List<?>) returnValue;
            if (list.isEmpty()) {
                // 如果为空列表，尝试获取泛型类型，写入空表头
                Class<?> targetClass = getTargetClass(returnType);
                if (targetClass != null) {
                    ExcelUtils.write(response.getOutputStream(), (Class) targetClass, (List) list,
                            responseExcel.sheet());
                }
                return;
            }

            Class<?> clazz = list.get(0).getClass();
            ExcelUtils.write(response.getOutputStream(), (Class) clazz, (List) list, responseExcel.sheet());
        }
    }

    /**
     * 解析文件名中的占位符
     * 支持格式：
     * {paramName} - 请求参数
     * {yyyyMMdd} - 当前日期格式化
     */
    private String resolveFileName(String fileName, HttpServletRequest request) {
        if (!StringUtils.hasText(fileName)) {
            return fileName;
        }

        Matcher matcher = PARAM_PATTERN.matcher(fileName);
        StringBuffer sb = new StringBuffer();
        while (matcher.find()) {
            String key = matcher.group(1);
            String replacement = "";
            // 尝试作为日期格式解析
            try {
                replacement = LocalDateTime.now().format(DateTimeFormatter.ofPattern(key));
            } catch (Exception e) {
                // 不是日期格式，尝试从请求参数获取
                if (request != null) {
                    String paramValue = request.getParameter(key);
                    if (paramValue != null) {
                        replacement = paramValue;
                    }
                }
            }
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    /**
     * 获取目标类型（List<T> 中的 T）
     */
    private Class<?> getTargetClass(MethodParameter parameter) {
        Type type = parameter.getGenericParameterType();
        if (type instanceof ParameterizedType) {
            ParameterizedType parameterizedType = (ParameterizedType) type;
            Type[] actualTypeArguments = parameterizedType.getActualTypeArguments();
            if (actualTypeArguments != null && actualTypeArguments.length > 0) {
                return (Class<?>) actualTypeArguments[0];
            }
        }
        return null;
    }
}
