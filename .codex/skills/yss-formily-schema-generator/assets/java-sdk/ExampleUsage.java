package com.yss.formily.sdk;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Example for building a YssFormily definition with:
 * mode switching, detail options, scope/effects metadata, remote dicts,
 * events, async validation, and multi-dependency linkage.
 */
public class ExampleUsage {

    public static void main(String[] args) {
        Map<String, Object> initialValues = new LinkedHashMap<>();
        initialValues.put("enabled", Boolean.TRUE);

        Map<String, Object> modelShape = new LinkedHashMap<>();
        modelShape.put("processName", "");
        modelShape.put("processType", null);
        modelShape.put("enabled", Boolean.TRUE);
        modelShape.put("approvalMode", null);
        modelShape.put("approverType", null);
        modelShape.put("description", "");
        modelShape.put("formSchema", "");

        YssFormilyDsl.YssFormDefinition definition = YssFormilyDsl.form()
            .mode(YssFormilyDsl.Mode.EDIT)
            .horizontal(120)
            .gridDefaults(3, 1, 260, 16, 0)
            .initialValues(initialValues)
            .modelShape(modelShape)
            .scopeKeys("onSubmit", "dicts", "validateProcessName")
            .components("YMonaco")
            .detailOption("bordered", true)
            .detailOption("maxColumns", 2)
            .fieldEffects(
                YssFormilyDsl.onFieldValueChange("processType", "{{ onProcessTypeChanged }}"),
                YssFormilyDsl.onFieldValueChange("approvalMode", "{{ onApprovalModeChanged }}")
            )
            .effects(
                YssFormilyDsl.onFormSubmit("{{ onFormSubmit }}"),
                YssFormilyDsl.onFormSubmitFailed("{{ onFormSubmitFailed }}")
            )
            .nodes(
                YssFormilyDsl.groupHeader("baseInfoHeader", "基本信息")
                    .componentProp("description", "流程基础配置"),

                YssFormilyDsl.input("processName", "流程名称")
                    .required()
                    .placeholder("请输入流程名称")
                    .tooltip("流程名称用于审批发起时展示")
                    .event("onUpdate:value", "{{ onProcessNameInput }}")
                    .validator(YssFormilyDsl.requiredValidator("请输入流程名称"))
                    .validator(YssFormilyDsl.asyncValidator("onBlur", "{{ validateProcessName }}", "流程名称已存在")),

                YssFormilyDsl.select("processType", "流程类型")
                    .required()
                    .placeholder("请选择流程类型")
                    .remoteDict(
                        YssFormilyDsl.remoteDict("approval_process_type", "processTypeOptions")
                            .previewFormat("{{ formatDictLabel($self.value, dicts.processTypeOptions) }}")
                    )
                    .event("onChange", "{{ onProcessTypeChange }}"),

                YssFormilyDsl.radioGroup("approvalMode", "审批模式")
                    .required()
                    .options(
                        YssFormilyDsl.option("SINGLE", "单人审批"),
                        YssFormilyDsl.option("PARALLEL", "并行审批"),
                        YssFormilyDsl.option("SEQUENTIAL", "串行审批")
                    ),

                YssFormilyDsl.select("approverType", "审批人类型")
                    .placeholder("请选择审批人类型")
                    .reaction(
                        YssFormilyDsl.reaction()
                            .dependencies("processType", "approvalMode")
                            .when("{{ $deps[0] === 'LEAVE' && $deps[1] !== 'SINGLE' }}")
                            .fulfillState("visible", true)
                            .fulfillState("required", true)
                            .otherwiseState("visible", false)
                            .otherwiseState("required", false)
                    ),

                YssFormilyDsl.switchField("enabled", "是否启用")
                    .componentProp("checkedChildren", "启用")
                    .componentProp("unCheckedChildren", "停用")
                    .event("onChange", "{{ onEnabledChange }}"),

                YssFormilyDsl.textArea("description", "流程说明")
                    .placeholder("请输入流程说明")
                    .componentProp("rows", 4)
                    .gridSpan(2)
                    .disabledExpr("{{ $values.enabled === false }}"),

                YssFormilyDsl.slot("formSchema", "表单Schema", "formSchemaEditor")
                    .required()
                    .gridSpan(3)
                    .visibleExpr("{{ $values.processType !== undefined && $values.processType !== null }}"),

                YssFormilyDsl.autoButtonGroup("actions")
                    .componentProp("align", "right")
                    .property("reset", YssFormilyDsl.reset("reset", "重置").build())
                    .property("submit", YssFormilyDsl.submit("submit", "提交", "{{ onSubmit }}").build())
            )
            .build();

        Map<String, Object> payload = definition.toMap();
        System.out.println(payload);
    }
}
