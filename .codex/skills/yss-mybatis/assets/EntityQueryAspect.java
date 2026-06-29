package com.yss.cloud.mybatis.aop;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.yss.cloud.dto.page.PageQuery;
import lombok.SneakyThrows;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;

@Aspect
public class EntityQueryAspect {

    /**
     * 字段开启分页的方法
     *
     * @apiNote 1. 包命名需符合规范 com.yss.datamiddle.(项目名).service?.impl.serviceImpl.method <br/> 2. 参数为pageQuery dto的方法
     * @param joinPoint 加入切点
     * @param pageQuery 查询分页对象dtp
     * @return 执行结果
     */
    @Around("( (execution(public * (@org.springframework.stereotype.Repository *).*(..)) || execution(* com.yss..*.gateway.impl.*.*(..))))&& (args(pageQuery)||args(pageQuery,..))")
    @SneakyThrows
    public Object interceptEntityQueries(ProceedingJoinPoint joinPoint, PageQuery pageQuery) {
        if (pageQuery != null) {
            //分页查询开始
            Page<Object> page = PageHelper.offsetPage(pageQuery.getOffset(), pageQuery.getPageSize());
            // 继续执行目标方法
            Object result = joinPoint.proceed();
            long total = page.getTotal();
            pageQuery.setTempTotalCount(total);
            return result;
        }
        // 不满足条件时直接执行目标方法
        return joinPoint.proceed();
    }
}
