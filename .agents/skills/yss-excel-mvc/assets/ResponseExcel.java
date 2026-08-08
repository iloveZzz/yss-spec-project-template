package com.yss.excel.mvc.annotation;

import java.lang.annotation.*;

/**
 * 导出Excel注解
 * 用于Controller方法，将返回值导出为Excel文件
 *
 * @author daomingzhu
 * @date 2024-01-13
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ResponseExcel {

    /**
     * 导出的文件名称
     */
    String name() default "";

    /**
     * Sheet名称
     */
    String sheet() default "Sheet1";

    /**
     * 文件后缀，支持 xlsx, xls, csv
     */
    String suffix() default "xlsx";

    /**
     * 密码（可选）
     */
    String password() default "";
    
    /**
     * 包含的字段（可选）
     */
    String[] include() default {};

    /**
     * 排除的字段（可选）
     */
    String[] exclude() default {};
}
