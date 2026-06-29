package com.yss.cloud.sankuai.mybatis;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.yss.cloud.exception.BizException;
import com.yss.cloud.sankuai.CosidSegmentContextHelper;
import com.yss.cloud.sankuai.GenerationTypeSeq;
import com.yss.cloud.sankuai.SegmentContextHelper;
import com.yss.cloud.sankuai.SnowflakeContextHelper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.ibatis.binding.BindingException;
import org.apache.ibatis.binding.MapperMethod;
import org.apache.ibatis.executor.statement.StatementHandler;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.plugin.Interceptor;
import org.apache.ibatis.plugin.Intercepts;
import org.apache.ibatis.plugin.Invocation;
import org.apache.ibatis.plugin.Signature;
import org.springframework.util.ObjectUtils;
import org.springframework.util.ReflectionUtils;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Table;
import java.lang.reflect.Field;
import java.sql.Connection;
import java.util.*;

@Intercepts(
    {
        @Signature(type = StatementHandler.class, method = "prepare", args = {Connection.class, Integer.class})
    }
)
@Slf4j
public class AutoIdInterceptor implements Interceptor {

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        StatementHandler statementHandler = (StatementHandler) invocation.getTarget();
        BoundSql boundSql = statementHandler.getBoundSql();
        String boundSqlStr = boundSql.getSql();
        if (StringUtils.startsWithIgnoreCase(StringUtils.trim(boundSqlStr),"INSERT")){
            processInsertStatement(statementHandler);
        }

        return invocation.proceed();
    }

    /**
     * 1.处理插入的情况
     *
     * @apiNote 1.处理新增insert
     * @param statementHandler 句柄
     */
    private void processInsertStatement(StatementHandler statementHandler) {
        BoundSql boundSql = statementHandler.getBoundSql();
        Object parameterObject = boundSql.getParameterObject();

        if (parameterObject != null) {
            processParameterObject(parameterObject);
        }
    }

    /**
     * 处理参数对象
     *
     * @apiNote 2.处理参数对象 mapper->entityList,plus->param1
     * @param parameterObject 参数对象
     */
    private void processParameterObject(Object parameterObject) {
        if (parameterObject instanceof MapperMethod.ParamMap<?>){
            // 获取批量实体对象，若为空则为single 参数对象
            Object entityList = null;
            try {
                entityList = ((MapperMethod.ParamMap<?>) parameterObject).get("entityList");
            }catch (BindingException e){
                log.warn("non entityList. info -> {}",e.getLocalizedMessage());
            }
            // 兼容mybatis默认参数 集合的场景
            if (ObjectUtils.isEmpty(entityList)){
                try {
                    entityList = ((MapperMethod.ParamMap<?>) parameterObject).get("collection");
                }catch (BindingException e){
                    log.warn("non entityList & non collection. info -> {}",e.getLocalizedMessage());
                }
            }
            // 兼容mybatis默认参数 数组的场景
            if (ObjectUtils.isEmpty(entityList)){
                try {
                    entityList = ((MapperMethod.ParamMap<?>) parameterObject).get("array");
                }catch (BindingException e){
                    log.warn("non entityList & non collection & non array. info -> {}",e.getLocalizedMessage());
                }
            }
            if (ObjectUtils.isEmpty(entityList)){
                try {
                    entityList = ((MapperMethod.ParamMap<?>) parameterObject).get("param1");
                }catch (BindingException e){
                    log.error("non param1. info -> {}",e.getLocalizedMessage());
                    throw new BizException("FeignAutoIdInterceptor run error");
                }
            }
            if (entityList instanceof List) {
                // 批量插入
                List<?> el = (List<?>) entityList;
                for (Object entity : el) {
                    processEntity(entity);
                }
            } else  if (entityList.getClass().isArray()) {
                // 批量插入
                Object[] array = (Object[]) entityList;
                for (Object entity : array) {
                    processEntity(entity);
                }
            }else {
                // 单独插入
                processEntity(entityList);
            }
        } else {
            // 单独插入
            processEntity(parameterObject);
        }
    }

    /**
     * 3.处理对象实体
     *
     * @apiNote 3.处理对象实体
     * @param entity 对象实体
     */
    private void processEntity(Object entity) {
        Class<?> entityClass = entity.getClass();
        if (isEntityClass(entityClass)) {
            autoIdSet(entity);
        }
    }

    /**
     * 4.自动为实体设置id
     *
     * @apiNote 4.自动为实体设置id
     * @param entity 对象实体
     */
    private void autoIdSet(Object entity) {
        Class<?> entityClass = entity.getClass();
        List<Field> fields = getAllFields(entityClass);
        for (Field field : fields) {

            if (field.isAnnotationPresent(GeneratedValue.class)||
                    field.isAnnotationPresent(TableId.class)) {
                processGeneratedValue(entity, field);
            }
        }
    }

    /**
     * 5.设置id字段
     *
     * @param entity 实体对象
     * @param field id字段
     */
    private void processGeneratedValue(Object entity, Field field) {
        String genIdType = getGenIdType(field);

        String tableName = getTableName(entity);

        if (Objects.nonNull(genIdType)&&
                Objects.nonNull(SegmentContextHelper.LeafConf())&&
                SegmentContextHelper.LeafConf().isLeafSegmentEnable()&&
                (genIdType.equals(GenerationTypeSeq.SEGMENT) || genIdType.equals(IdType.AUTO.name()) || genIdType.equals(IdType.ASSIGN_ID.name()))) {
            long idValue = SegmentContextHelper.nextId(tableName);
            setFieldValue(entity, field, idValue);
        } else if (Objects.nonNull(genIdType)&&
                Objects.nonNull(SnowflakeContextHelper.LeafConf())&&
                SnowflakeContextHelper.LeafConf().isLeafSnowflakeEnable()
                &&genIdType.equals(GenerationTypeSeq.SNOWFLAKE) ) {
            long idValue = SnowflakeContextHelper.nextId();
            setFieldValue(entity, field, idValue);
        } else if (Objects.nonNull(genIdType)&&
                (genIdType.equals(GenerationTypeSeq.UUID)|| genIdType.equals(IdType.ASSIGN_UUID.name()))) {
            String idValue = UUID.randomUUID().toString();
            setFieldValue(entity, field, idValue);
        } else if (Objects.nonNull(genIdType) &&
                genIdType.equals(GenerationTypeSeq.COSID_SEGMENT)) {
            long idValue = CosidSegmentContextHelper.nextId(tableName);
            setFieldValue(entity, field, idValue);
        }
    }

    private void setFieldValue(Object entity, Field field, Object value) {
        field.setAccessible(true);
        // 如果value为null,则ID生成服务不可用,使用默认规则替代;有值则覆盖
        if(!Objects.isNull(value)) {
            if (field.getType() == String.class) {
                ReflectionUtils.setField(field,entity,String.valueOf(value));
            } else if (field.getType() == Integer.class) {
                ReflectionUtils.setField(field,entity,Integer.valueOf(String.valueOf(value)));
            } else {
                ReflectionUtils.setField(field,entity,value);
            }
        }
    }

    private boolean isEntityClass(Class<?> clazz) {
        return clazz.isAnnotationPresent(Entity.class)||clazz.isAnnotationPresent(TableName.class);
    }

    private String getTableName(Object entity){
        Table table = entity.getClass().getAnnotation(Table.class);
        if (Objects.nonNull(table)){
            return table.name();
        }

        TableName tableName = entity.getClass().getAnnotation(TableName.class);

        if (Objects.nonNull(tableName)){
            return tableName.value();
        }

        return null;
    }
    private static List<Field> getAllFields(Class<?> clazz) {
        List<Field> fields = new ArrayList<>();
        while (clazz != null) {
            Collections.addAll(fields, clazz.getDeclaredFields());
            clazz = clazz.getSuperclass();
        }
        return fields;
    }
    private String getGenIdType(Field field){
        GeneratedValue generatedValueAnnotation = field.getAnnotation(GeneratedValue.class);

        if (Objects.nonNull(generatedValueAnnotation)){
           return generatedValueAnnotation.generator();
        }

        TableId tableId = field.getAnnotation(TableId.class);

        if (Objects.nonNull(tableId)){
            return tableId.type().name();
        }
        return null;
    }
}
