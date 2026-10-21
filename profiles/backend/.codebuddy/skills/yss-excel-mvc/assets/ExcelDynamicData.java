package com.yss.excel.mvc.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 动态Excel导出数据模型
 *
 * @author daomingzhu
 * @date 2024-01-23
 */
public class ExcelDynamicData {

    /**
     * 列名列表（Map中的Key）
     */
    private List<String> columns = new ArrayList<>();

    /**
     * 列名中文列表（Excel表头）
     */
    private List<String> columnCn = new ArrayList<>();

    /**
     * 行数据列表
     */
    private List<Map<String, Object>> rows = new ArrayList<>();

    /**
     * 导出文件名（可选，优先级高于注解）
     */
    private String fileName;

    public List<String> getColumns() {
        return columns;
    }

    public void setColumns(List<String> columns) {
        this.columns = columns;
    }

    public List<String> getColumnCn() {
        return columnCn;
    }

    public void setColumnCn(List<String> columnCn) {
        this.columnCn = columnCn;
    }

    public List<Map<String, Object>> getRows() {
        return rows;
    }

    public void setRows(List<Map<String, Object>> rows) {
        this.rows = rows;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}
