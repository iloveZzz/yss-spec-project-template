package com.yss.cloud.mybatis;

import com.yss.cloud.mybatis.config.PageQueryEntityConfigration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;


@Configuration
@Import({
        PageQueryEntityConfigration.class}
)
@EnableConfigurationProperties({PrimaryDataSourceProperties.class,
        MybatisPlusGlobalProperties.class,
        YssMybatisMapperProperties.class})
public class MybatisBaseConfiguration {

}
