package com.yss.cloud.jdbc.db;

import cn.hutool.db.Db;
import cn.hutool.db.Entity;
import cn.hutool.db.Session;
import cn.hutool.db.ds.simple.SimpleDataSource;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.*;
import java.util.function.BiConsumer;
import java.util.stream.Collectors;

/**
 * @author zhudaoming
 */
public class JdbcSqlUtil {

    public static Db getDb(DsParam dsParam) {
        return Db.use(
                new SimpleDataSource(
                        dsParam.getJdbc(),
                        dsParam.getUserName(),
                        dsParam.getPassword(),
                        dsParam.getDriverClass()));
    }

    public static Db getDb(DataSource dataSource) {
        return Db.use(dataSource);
    }
    public static Session getDbSession(DataSource dataSource) {
        return Session.create(dataSource);
    }

    public static Session getDbSession(DsParam dsParam) {
        return Session.create(new SimpleDataSource(
                dsParam.getJdbc(),
                dsParam.getUserName(),
                dsParam.getPassword(),
                dsParam.getDriverClass()));
    }

    public static List<Object[]> createBatchDataParam(Object[]... paramArray){
        return new ArrayList<>(Arrays.asList(paramArray));
    }
    public static Object[] createQueryDataParam(Object... param){
        return param;
    }

    public static void batchAddTableData(String toTable, List<Entity> entities, BiConsumer<String,List<Object[]>> taskCallback) throws SQLException {
        if (!entities.isEmpty()){
           String paramRex = entities.stream().findFirst().get().getFieldNames().stream().map(e->"?").collect(Collectors.joining(","));
            String fields =entities.stream().findFirst().get().getFieldNames().stream().collect(Collectors.joining(","));
            List<Object[]> allData = entities.stream().map(e -> e.values().toArray()).collect(Collectors.toList());
            String batchSql = "insert into " +
                    toTable +
                    "(" +
                    fields +
                    ")" +
                    "values" +
                    "(" +
                    paramRex +
                    ")";
            taskCallback.accept(batchSql,allData);
        }
    }

    public static void batchAddMapData(String toTable, List<Map<String,String>> mapData, BiConsumer<String,List<Object[]>> taskCallback) throws SQLException {
        if (!mapData.isEmpty()){
            String paramRex;
            String fields;
            Optional<Map<String, String>> mapOptional = mapData.stream().findFirst();
            Map<String, String> dataMap = mapOptional.get();
            Set<Map.Entry<String, String>> entries = dataMap.entrySet();
            paramRex = entries.stream().map(e -> "?").collect(Collectors.joining(","));
            fields = entries.stream().map(Map.Entry::getKey).collect(Collectors.joining(","));

            List<Object[]> allData = mapData.stream().map(m -> m.values().toArray()).collect(Collectors.toList());
            String batchSql = "insert into " +
                    toTable +
                    "(" +
                    fields +
                    ")" +
                    "values" +
                    "(" +
                    paramRex +
                    ")";
            taskCallback.accept(batchSql,allData);
        }

    }
}
