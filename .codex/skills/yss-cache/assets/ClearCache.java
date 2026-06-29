package com.yss.cloud.cache.annotation;

import com.yss.cloud.cache.CacheKeyCode;
import org.springframework.core.annotation.AliasFor;

import java.lang.annotation.*;

/**
 * @author zhudaoming
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Inherited
@Documented
public @interface ClearCache {

  @AliasFor("cacheNames")
  CacheKeyCode[] value() default {CacheKeyCode.DATA_MIDDLE_CACHE_DEFAULT};

  @AliasFor("value")
  CacheKeyCode[] cacheNames() default {CacheKeyCode.DATA_MIDDLE_CACHE_DEFAULT};
  String cacheName() default "";
  String key() default "";

  String keyGenerator() default "";

  String cacheResolver() default "cacheComposeResolver";

  String condition() default "";

  String unless() default "";

  boolean sync() default false;
}
