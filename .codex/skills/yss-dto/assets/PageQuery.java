package com.yss.cloud.dto.page;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.yss.cloud.dto.QueryDTO;

public class PageQuery extends QueryDTO {

  private static final long serialVersionUID = 1L;

  public static final String ASC = "ASC";

  public static final String DESC = "DESC";

  private static final int DEFAULT_PAGE_SIZE = 10;
  /**
   * 每页显示
   * @mock 10
   */
  private int pageSize = DEFAULT_PAGE_SIZE;

  /**
   * 当前页
   * @mock 1
   */
  private int pageIndex = 1;

  /**
   * 排序字段
   * @mock id
   */
  private String orderBy;

  /**
   * 默认倒序
   * @mock DESC
   */
  private String orderDirection = DESC;

  /** 分组字段 */
  private String groupBy;

  /**
   * 是否需要总数
   * @apiNote 暂时未实现
   * @mock true
   */
  @JsonIgnore
  private boolean needTotalCount = true;

  /**
   * 总数dto临时字段，忽略即可
   * @mock 0
   */
  @JsonIgnore
  private long tempTotalCount = 0;

  public int getPageIndex() {
    return Math.max(pageIndex, 1);
  }

  public PageQuery setPageIndex(int pageIndex) {
    this.pageIndex = pageIndex;
    return this;
  }

  public int getPageSize() {
    if (pageSize < 1) {
      pageSize = DEFAULT_PAGE_SIZE;
    }
    return pageSize;
  }

  public PageQuery setPageSize(int pageSize) {
    if (pageSize < 1) {
      pageSize = DEFAULT_PAGE_SIZE;
    }
    this.pageSize = pageSize;
    return this;
  }

  public int getOffset() {
    return (getPageIndex() - 1) * getPageSize();
  }

  public String getOrderBy() {
    return orderBy;
  }

  public PageQuery setOrderBy(String orderBy) {
    this.orderBy = orderBy;
    return this;
  }

  public String getOrderDirection() {
    return orderDirection;
  }

  public PageQuery setOrderDirection(String orderDirection) {
    if (ASC.equalsIgnoreCase(orderDirection) || DESC.equalsIgnoreCase(orderDirection)) {
      this.orderDirection = orderDirection;
    }
    return this;
  }

  public long getTempTotalCount() {
    return tempTotalCount;
  }

  public void setTempTotalCount(long tempTotalCount) {
    this.tempTotalCount = tempTotalCount;
  }

  public String getGroupBy() {
    return groupBy;
  }

  public void setGroupBy(String groupBy) {
    this.groupBy = groupBy;
  }

  public boolean isNeedTotalCount() {
    return needTotalCount;
  }

  public void setNeedTotalCount(boolean needTotalCount) {
    this.needTotalCount = needTotalCount;
  }

  @Override
  public String toString() {
    return "PageQuery(" + "pageSize=" + pageSize + ", pageIndex=" + pageIndex + ')';
  }
}
