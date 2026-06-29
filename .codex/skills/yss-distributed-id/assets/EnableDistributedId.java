package com.yss.cloud;

import com.yss.cloud.sankuai.config.LeafConf;
import com.yss.cloud.sankuai.config.LeafDataSourceConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

import java.lang.annotation.*;

@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@Import({LeafDataSourceConfiguration.class, EnableDistributedImportSelector.class})
@EnableConfigurationProperties(LeafConf.class)
public @interface EnableDistributedId {
  /**
   * 默认自动装载leaf配置，设置默认启用状态
   */
  boolean autoRegister() default true;
  /**
   * 是否启用cosid模式
   */
  boolean cosid() default false;
}
