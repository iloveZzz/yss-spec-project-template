package com.yss.cloud.jdbc.db;

import cn.hutool.db.Db;
import cn.hutool.db.Session;
import com.yss.cloud.mybatis.MultiDataSourceHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.sql.DataSource;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DefaultHutoolDbHolder {
    public final MultiDataSourceHolder multiDataSourceHolder;
    public static Map<String,DataSource> dataSourceMapTemp;

    @PostConstruct
    public void init(){
        dataSourceMapTemp = multiDataSourceHolder.getMultiDataSource();
    }

    public static DataSource getAppDs(String dsName){
        return dataSourceMapTemp.get(dsName);
    }
    public static Db getDb(String dsName) {
        return Db.use(getAppDs(dsName));
    }
    public static Session getSession(String dsName) {
        return Session.create(getAppDs(dsName));
    }
}
