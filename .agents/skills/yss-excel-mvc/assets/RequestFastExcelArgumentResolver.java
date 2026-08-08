package com.yss.excel.mvc.handler;

import com.yss.excel.mvc.annotation.RequestExcel;
import com.yss.excel.mvc.util.ExcelUtils;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cglib.beans.BeanMap;
import org.springframework.core.MethodParameter;
import org.apache.fesod.sheet.annotation.ExcelProperty;
import com.yss.excel.mvc.exception.ExcelDataValidationException;
import org.springframework.util.MultiValueMap;
import org.springframework.validation.BindException;
import org.springframework.validation.annotation.Validated;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import javax.servlet.http.HttpServletRequest;
import javax.validation.ConstraintViolation;
import javax.validation.Valid;
import javax.validation.Validator;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.*;

/**
 * Excel导入参数解析器
 *
 * @author daomingzhu
 * @date 2024-01-13
 */
@Slf4j
public class RequestFastExcelArgumentResolver implements HandlerMethodArgumentResolver {

    @Setter
    private Validator validator;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(RequestExcel.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest, WebDataBinderFactory binderFactory) throws Exception {
        RequestExcel requestExcel = parameter.getParameterAnnotation(RequestExcel.class);
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        if (request == null) {
            throw new IllegalArgumentException("HTTP request cannot be null");
        }
        List<InputStream> inputStreams = new ArrayList<>();
        try {
            if (!(request instanceof MultipartHttpServletRequest)) {
                inputStreams.add(request.getInputStream());
            } else {
                MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
                MultiValueMap<String, MultipartFile> multipartRequestFileMap = multipartRequest.getMultiFileMap();
                if (multipartRequestFileMap.isEmpty()) {
                    log.warn("Uploaded file is empty for parameter: {}", parameter.getParameterName());
                    return Collections.emptyList();
                }

                // 获取所有文件
                multipartRequestFileMap.forEach((key, multipartFile) -> {
                    for (MultipartFile file : multipartFile) {
                        if (!file.isEmpty()) {
                            // 验证文件类型
                            validateFileType(file);

                            // 校验文件名正则匹配
                            if (StringUtils.hasText(requestExcel.matchFilePattern())) {
                                String originalFilename = file.getOriginalFilename();
                                if (originalFilename != null && !originalFilename.matches(requestExcel.matchFilePattern())) {
                                    throw new IllegalArgumentException(String.format("文件名 [%s] 不匹配校验规则 [%s]", originalFilename,
                                            requestExcel.matchFilePattern()));
                                }
                            }
                            try {
                                inputStreams.add(file.getInputStream());
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        }
                    }
                });

                if (inputStreams.isEmpty()) {
                    log.warn("No valid files found for parameter: {}", parameter.getParameterName());
                    return Collections.emptyList();
                }
            }

            Class<?> targetClass = getTargetClass(parameter);
            if (targetClass == null) {
                log.warn("Could not determine target class for parameter: {}", parameter.getParameterName());
                return Collections.emptyList();
            }

            List<Object> allList = new ArrayList<>();
            try {
                for (InputStream is : inputStreams) {
                    List<?> list = ExcelUtils.read(is, targetClass);
                    if (list != null) {
                        allList.addAll((List) list);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to parse excel file for parameter: {}", parameter.getParameterName(), e);
                throw new RuntimeException("Excel parsing failed: " + e.getMessage());
            }

            // 数据校验
            validateIfApplicable(parameter, requestExcel.throwErrorData(), allList);

            return allList;
        } finally {
            for (InputStream is : inputStreams) {
                if (is != null) {
                    try {
                        is.close();
                    } catch (IOException e) {
                        log.warn("Failed to close input stream", e);
                    }
                }
            }
        }
    }

    private void validateIfApplicable(MethodParameter parameter, Boolean throwErrorData, List<?> list)
            throws BindException {
        if (validator == null || list == null || list.isEmpty()) {
            return;
        }

        if (parameter.hasParameterAnnotation(Validated.class) || parameter.hasParameterAnnotation(Valid.class)) {
            java.util.LinkedList<java.util.Map<String, Object>> errorDataList = new java.util.LinkedList<>();
            boolean hasError = false;
            java.util.Map<String, String> errorHeader = new java.util.LinkedHashMap<>();
            Class<?> targetClass = getTargetClass(parameter);

            // 提取表头信息
            if (targetClass != null) {
                java.lang.reflect.Field[] fields = targetClass.getDeclaredFields();
                for (java.lang.reflect.Field field : fields) {
                    ExcelProperty excelProperty = field.getAnnotation(ExcelProperty.class);
                    if (excelProperty != null && excelProperty.value().length > 0) {
                        errorHeader.put(field.getName(), excelProperty.value()[0]);
                    } else {
                        errorHeader.put(field.getName(), field.getName());
                    }
                }
                errorHeader.put("errorMessage", "错误信息");
            }

            List<String> errorMessages = new ArrayList<>();
            for (Object object : list) {
                Set<ConstraintViolation<Object>> violations = validator.validate(object);
                if (!violations.isEmpty()) {
                    hasError = true;
                    java.util.Map<String, Object> map = BeanMap.create(object);
                    StringBuilder errorMessage = new StringBuilder();
                    for (ConstraintViolation<Object> violation : violations) {
                        if (errorMessage.length() > 0) {
                            errorMessage.append("; ");
                        }
                        String fieldErrorName = violation.getPropertyPath().toString();
                        if (errorHeader.containsKey(fieldErrorName)) {
                            fieldErrorName = errorHeader.get(fieldErrorName);
                        }
                        errorMessage.append(fieldErrorName).append(violation.getMessage());
                    }
                    errorMessages.add(errorMessage.toString());
                    map.put("errorMessage", errorMessage.toString());
                    errorDataList.add(map);
                }
            }

            if (!Boolean.TRUE.equals(throwErrorData)) {
                if (hasError) {
                    throw new IllegalArgumentException("Data validation errors: " + errorMessages);
                }
            } else {
                if (hasError) {
                    throw new ExcelDataValidationException(errorHeader, errorDataList);
                }
            }
        }
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

    /**
     * 验证上传的文件类型是否为Excel文件
     *
     * @param file 上传的文件
     * @throws IllegalArgumentException 如果文件不是Excel格式
     */
    private void validateFileType(MultipartFile file) {
        String fileName = file.getOriginalFilename();
        if (fileName == null) {
            throw new IllegalArgumentException("File name cannot be null");
        }
        String contentType = file.getContentType();
        String fileExtension = getFileExtension(fileName);
        // 检查文件扩展名和内容类型
        boolean isValidExcel = isValidExcelExtension(fileExtension) || isValidExcelContentType(contentType);
        if (!isValidExcel) {
            log.warn("Invalid file type detected. File name: {}, Content type: {}", fileName, contentType);
            throw new IllegalArgumentException(
                    String.format("Invalid file type: %s. Only Excel files (.xls, .xlsx) are allowed.", fileName));
        }
    }

    /**
     * 获取文件扩展名
     *
     * @param fileName 文件名
     * @return 扩展名（不包含点号）
     */
    private String getFileExtension(String fileName) {
        int lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex > 0 && lastDotIndex < fileName.length() - 1) {
            return fileName.substring(lastDotIndex + 1).toLowerCase();
        }
        return "";
    }

    /**
     * 检查文件扩展名是否为有效的Excel格式
     *
     * @param extension 文件扩展名
     * @return 是否为有效Excel扩展名
     */
    private boolean isValidExcelExtension(String extension) {
        return "xls".equals(extension) || "xlsx".equals(extension);
    }

    /**
     * 检查内容类型是否为有效的Excel格式
     *
     * @param contentType 内容类型
     * @return 是否为有效Excel内容类型
     */
    private boolean isValidExcelContentType(String contentType) {
        if (contentType == null) {
            return false;
        }
        return contentType.equals("application/vnd.ms-excel") ||
                contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
                contentType.startsWith("application/vnd.ms-excel") ||
                contentType.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml");
    }
}
