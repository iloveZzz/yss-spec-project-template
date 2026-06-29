package com.yss.cloud.mybatis.config;

import com.yss.cloud.mybatis.aop.EntityQueryAspect;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
@Slf4j
public class PageQueryEntityConfigration {
    @Primary
    @Bean
    public EntityQueryAspect entityQueryAspect() {
        log.info("【MapperConfiguration】DataSource 获取数据源primaryDataSourceProperties配置");
        return new EntityQueryAspect();
    }
}
