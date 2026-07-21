package com.yss.cloud.mybatis.support;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.toolkit.Constants;
import io.mybatis.mapper.BaseMapper;
import io.mybatis.mapper.list.ListMapper;
import io.mybatis.mapper.list.ListProvider;
import io.mybatis.provider.Caching;
import com.baomidou.mybatisplus.core.mapper.Mapper;
import org.apache.ibatis.annotations.*;

import java.io.Serializable;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * @author zhudaoming
 */
public interface BaseRepository<T, D extends Serializable> extends Mapper<T>, BaseMapper<T, D>, ListMapper<T> {
    /**s
    /**
     * 删除（根据ID或实体 批量删除）
     *
     * @param idList 主键ID列表或实体列表(不能为 null 以及 empty)
     */
    int deleteBatchIds(@Param(Constants.COLL) Collection<?> idList);
    /**
     * 查询（根据ID 批量查询）
     *
     * @param idList 主键ID列表(不能为 null 以及 empty)
     */
    List<T> selectBatchIds(@Param(Constants.COLL) Collection<? extends Serializable> idList);
    /**
     * 查询（根据 columnMap 条件）
     *
     * @param columnMap 表字段 map 对象
     */
    List<T> selectByMap(@Param(Constants.COLUMN_MAP) Map<String, Object> columnMap);
    /**
     * 根据 Wrapper 条件，查询全部记录
     *
     * @param queryWrapper 实体对象封装操作类（可以为 null）
     */
    List<Map<String, Object>> selectMaps(@Param(Constants.WRAPPER) Wrapper<T> queryWrapper);

    /**
     * 根据 Wrapper 条件，查询全部记录
     * <p>注意： 只返回第一个字段的值</p>
     *
     * @param queryWrapper 实体对象封装操作类（可以为 null）
     */
    List<Object> selectObjs(@Param(Constants.WRAPPER) Wrapper<T> queryWrapper);
    /**
     * 保存实体，默认主键自增，并且名称为 id
     * <p>
     * 这个方法是个示例，你可以在自己的接口中使用相同的方式覆盖父接口中的配置
     *
     * @param entity 实体类
     * @return 1成功，0失败
     */
    @Override
    @Lang(Caching.class)
    @Options(useGeneratedKeys = true)
    @InsertProvider(type = EntityProvider.class, method = "insert")
    <S extends T> int insert(S entity);

    /**
     * 保存实体中不为空的字段，默认主键自增，并且名称为 id
     * <p>
     * 这个方法是个示例，你可以在自己的接口中使用相同的方式覆盖父接口中的配置
     *
     * @param entity 实体类
     * @return 1成功，0失败
     */
    @Override
    @Lang(Caching.class)
    @Options(useGeneratedKeys = true)
    @InsertProvider(type = EntityProvider.class, method = "insertSelective")
    <S extends T> int insertSelective(S entity);

    @Override
    @Lang(Caching.class)
    @Options(useGeneratedKeys = true)
    @InsertProvider(type = ListProvider.class, method = "insertList")
    <S extends T> int insertList(@Param("entityList") List<S> entityList);

    /**
     * 批量更新
     *
     * @author dengsd
     * @date 2022/9/27 11:49
     */
    @Override
    @Lang(Caching.class)
    @Options(useGeneratedKeys = true)
    @UpdateProvider(type = ListProvider.class, method = "updateList")
    <S extends T> int updateList(@Param("entityList") List<S> entityList);


    /**
     * 批量更新
     *
     * @author dengsd
     * @date 2022/9/27 11:49
     */
    @Override
    @Lang(Caching.class)
    @Options(useGeneratedKeys = true)
    @UpdateProvider(type = ListProvider.class, method = "updateListSelective")
    <S extends T> int updateListSelective(@Param("entityList") List<S> entityList);
}
