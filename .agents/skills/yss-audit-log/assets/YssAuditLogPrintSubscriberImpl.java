/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.yss.cloud.audit.subscriber.impl;

import com.yss.cloud.audit.subscriber.YssAuditSubscriber;
import com.yss.cloud.dto.audit.message.AuditMessage;
import lombok.extern.slf4j.Slf4j;

/**
 * 日志打印操作日志订阅器
 *
 * @author zhudaoming
 * @since 1.0.0
 */
@Slf4j
public class YssAuditLogPrintSubscriberImpl implements YssAuditSubscriber {

    @Override
    public void execute(AuditMessage message) {
        log.info("[AUDIT_MESSAGE] 审计日志 => {}",message.toString());
    }
}
