package com.yss.excel.mvc.annotation;

import java.lang.annotation.*;

/**
 * 导入Excel注解
 * 用于Controller方法参数，将上传的Excel文件解析为List对象
 *
 * @author daomingzhu
 * @date 2024-01-13
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequestExcel {

    /**
     * 前端上传的文件名称，默认为 file
     */
    String fileName() default "file";

    /**
     * 是否忽略空行
     */
    boolean ignoreEmptyRow() default true;
    boolean throwErrorData() default false;

    /**
     * 校验上传文件的原始文件名（正则表达式）
     * 如果不匹配则抛出异常
     */
    String matchFilePattern() default "";
}
