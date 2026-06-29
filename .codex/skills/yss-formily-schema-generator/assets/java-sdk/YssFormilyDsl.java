package com.yss.formily.sdk;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Java DSL for building YssFormily form definitions.
 *
 * <p>This SDK models:
 * <ul>
 *   <li>schema body</li>
 *   <li>form container config such as mode, detail-options, scope, effects</li>
 *   <li>typed enums for common schema types, components, events and options</li>
 * </ul>
 */
public final class YssFormilyDsl {

    private YssFormilyDsl() {
    }

    public interface WireValue {
        Object wireValue();
    }

    private interface HasMapValue {
        Map<String, Object> toMap();
    }

    public enum SchemaType implements WireValue {
        OBJECT("object"),
        VOID("void"),
        STRING("string"),
        NUMBER("number"),
        BOOLEAN("boolean"),
        ARRAY("array");

        private final String value;

        SchemaType(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum Component implements WireValue {
        FORM_LAYOUT("FormLayout"),
        FORM_GRID("FormGrid"),
        FORM_ITEM("FormItem"),
        INPUT("Input"),
        INPUT_TEXT_AREA("Input.TextArea"),
        INPUT_NUMBER("InputNumber"),
        SELECT("Select"),
        RADIO_GROUP("Radio.Group"),
        SWITCH("Switch"),
        DATE_PICKER("DatePicker"),
        DATE_RANGE_PICKER("DatePicker.RangePicker"),
        SLOT("Slot"),
        GROUP_HEADER("GroupHeader"),
        SUBMIT("Submit"),
        RESET("Reset"),
        AUTO_BUTTON_GROUP("AutoButtonGroup");

        private final String value;

        Component(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum Decorator implements WireValue {
        FORM_ITEM("FormItem");

        private final String value;

        Decorator(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum LayoutType implements WireValue {
        HORIZONTAL("horizontal"),
        VERTICAL("vertical");

        private final String value;

        LayoutType(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum LabelAlign implements WireValue {
        LEFT("left"),
        RIGHT("right");

        private final String value;

        LabelAlign(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum FormSize implements WireValue {
        SMALL("small"),
        MIDDLE("middle"),
        LARGE("large");

        private final String value;

        FormSize(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum EventType implements WireValue {
        ON_UPDATE_VALUE("onUpdate:value"),
        ON_CHANGE("onChange"),
        ON_SUBMIT("onSubmit");

        private final String value;

        EventType(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum ValidatorTrigger implements WireValue {
        ON_BLUR("onBlur"),
        ON_CHANGE("onChange"),
        ON_INPUT("onInput");

        private final String value;

        ValidatorTrigger(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum DetailOptionKey implements WireValue {
        COLUMNS("columns"),
        BORDERED("bordered"),
        HIDE_EMPTY("hideEmpty"),
        EMPTY_PLACEHOLDER("emptyPlaceholder"),
        LABEL_WIDTH("labelWidth"),
        RESPONSIVE("responsive"),
        MAX_COLUMNS("maxColumns"),
        MIN_COLUMNS("minColumns"),
        MIN_WIDTH("minWidth");

        private final String value;

        DetailOptionKey(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum FormEffectType implements WireValue {
        ON_FORM_SUBMIT("onFormSubmit"),
        ON_FORM_SUBMIT_FAILED("onFormSubmitFailed");

        private final String value;

        FormEffectType(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum FieldEffectType implements WireValue {
        ON_FIELD_VALUE_CHANGE("onFieldValueChange");

        private final String value;

        FieldEffectType(String value) {
            this.value = value;
        }

        @Override
        public String wireValue() {
            return value;
        }
    }

    public enum Mode implements WireValue {
        CREATE(0),
        EDIT(1),
        DETAIL(2);

        private final Integer code;

        Mode(Integer code) {
            this.code = code;
        }

        @Override
        public Integer wireValue() {
            return code;
        }
    }

    public static FormDefinitionBuilder form() {
        return new FormDefinitionBuilder();
    }

    public static NodeBuilder input(String name, String title) {
        return field(name, SchemaType.STRING, title, Component.INPUT);
    }

    public static NodeBuilder textArea(String name, String title) {
        return field(name, SchemaType.STRING, title, Component.INPUT_TEXT_AREA);
    }

    public static NodeBuilder inputNumber(String name, String title) {
        return field(name, SchemaType.NUMBER, title, Component.INPUT_NUMBER);
    }

    public static NodeBuilder select(String name, String title) {
        return field(name, SchemaType.STRING, title, Component.SELECT);
    }

    public static NodeBuilder multiSelect(String name, String title) {
        return field(name, SchemaType.ARRAY, title, Component.SELECT).componentProp("mode", "multiple");
    }

    public static NodeBuilder radioGroup(String name, String title) {
        return field(name, SchemaType.STRING, title, Component.RADIO_GROUP);
    }

    public static NodeBuilder switchField(String name, String title) {
        return field(name, SchemaType.BOOLEAN, title, Component.SWITCH);
    }

    public static NodeBuilder datePicker(String name, String title) {
        return field(name, SchemaType.STRING, title, Component.DATE_PICKER);
    }

    public static NodeBuilder rangePicker(String name, String title) {
        return field(name, SchemaType.ARRAY, title, Component.DATE_RANGE_PICKER);
    }

    public static NodeBuilder slot(String name, String title, String slotName) {
        return field(name, SchemaType.STRING, title, Component.SLOT).componentProp("name", slotName);
    }

    public static NodeBuilder groupHeader(String name, String title) {
        SchemaNode node = SchemaNode.of(SchemaType.VOID)
            .component(Component.GROUP_HEADER)
            .componentProp("title", title);
        return new NodeBuilder(name, node);
    }

    public static NodeBuilder submit(String name, String text, String onSubmitExpression) {
        SchemaNode node = SchemaNode.of(SchemaType.VOID)
            .component(Component.SUBMIT)
            .content(text)
            .componentProp(EventType.ON_SUBMIT, onSubmitExpression);
        return new NodeBuilder(name, node);
    }

    public static NodeBuilder reset(String name, String text) {
        SchemaNode node = SchemaNode.of(SchemaType.VOID)
            .component(Component.RESET)
            .content(text);
        return new NodeBuilder(name, node);
    }

    public static NodeBuilder autoButtonGroup(String name) {
        SchemaNode node = SchemaNode.of(SchemaType.VOID)
            .decorator(Decorator.FORM_ITEM)
            .component(Component.AUTO_BUTTON_GROUP);
        return new NodeBuilder(name, node);
    }

    public static NodeBuilder field(String name, SchemaType type, String title, Component component) {
        SchemaNode node = SchemaNode.of(type)
            .title(title)
            .decorator(Decorator.FORM_ITEM)
            .component(component);
        return new NodeBuilder(name, node);
    }

    public static NodeBuilder field(String name, String type, String title, String component) {
        return new NodeBuilder(name, SchemaNode.of(type).title(title).decorator(Decorator.FORM_ITEM.wireValue().toString()).component(component));
    }

    public static Option option(Object value, String label) {
        return new Option(value, label);
    }

    public static EventBinding event(String name, String expression) {
        return new EventBinding(name, expression);
    }

    public static EventBinding event(EventType eventType, String expression) {
        return new EventBinding(eventType.wireValue().toString(), expression);
    }

    public static Validator requiredValidator(String message) {
        return Validator.required(message);
    }

    public static Validator asyncValidator(String triggerType, String expression, String message) {
        return Validator.async(triggerType, expression, message);
    }

    public static Validator asyncValidator(ValidatorTrigger trigger, String expression, String message) {
        return Validator.async(trigger.wireValue().toString(), expression, message);
    }

    public static Reaction reaction() {
        return new Reaction();
    }

    public static DictConfig remoteDict(String dictCode, String optionsScopeKey) {
        return new DictConfig(dictCode, optionsScopeKey);
    }

    public static FieldEffect onFieldValueChange(String fieldPattern, String expression) {
        return FieldEffect.of(FieldEffectType.ON_FIELD_VALUE_CHANGE, fieldPattern, expression);
    }

    public static FormEffect onFormSubmit(String expression) {
        return FormEffect.of(FormEffectType.ON_FORM_SUBMIT, expression);
    }

    public static FormEffect onFormSubmitFailed(String expression) {
        return FormEffect.of(FormEffectType.ON_FORM_SUBMIT_FAILED, expression);
    }

    public static final class FormDefinitionBuilder {
        private final YssFormDefinition definition;
        private final SchemaNode layoutNode;
        private final SchemaNode gridNode;

        public FormDefinitionBuilder() {
            this.definition = new YssFormDefinition();
            this.layoutNode = SchemaNode.of(SchemaType.VOID).component(Component.FORM_LAYOUT);
            this.gridNode = SchemaNode.of(SchemaType.VOID).component(Component.FORM_GRID);
            this.layoutNode.property("grid", this.gridNode);
            this.definition.schema.property("layout", this.layoutNode);

            horizontal(120);
            gridDefaults(3, 1, 260, 16, 0);
        }

        public FormDefinitionBuilder horizontal(int labelWidth) {
            this.layoutNode.componentProp("layout", LayoutType.HORIZONTAL);
            this.layoutNode.componentProp("labelWidth", labelWidth);
            return this;
        }

        public FormDefinitionBuilder vertical() {
            this.layoutNode.componentProp("layout", LayoutType.VERTICAL);
            this.layoutNode.removeComponentProp("labelWidth");
            return this;
        }

        public FormDefinitionBuilder labelAlign(LabelAlign labelAlign) {
            this.layoutNode.componentProp("labelAlign", labelAlign);
            return this;
        }

        public FormDefinitionBuilder labelAlign(String labelAlign) {
            this.layoutNode.componentProp("labelAlign", labelAlign);
            return this;
        }

        public FormDefinitionBuilder size(FormSize size) {
            this.layoutNode.componentProp("size", size);
            return this;
        }

        public FormDefinitionBuilder size(String size) {
            this.layoutNode.componentProp("size", size);
            return this;
        }

        public FormDefinitionBuilder gridDefaults(int maxColumns, int minColumns, int minWidth, int columnGap, int rowGap) {
            this.gridNode.componentProp("maxColumns", maxColumns);
            this.gridNode.componentProp("minColumns", minColumns);
            this.gridNode.componentProp("minWidth", minWidth);
            this.gridNode.componentProp("columnGap", columnGap);
            this.gridNode.componentProp("rowGap", rowGap);
            this.definition.gridDefaults.put("maxColumns", maxColumns);
            this.definition.gridDefaults.put("minColumns", minColumns);
            this.definition.gridDefaults.put("minWidth", minWidth);
            this.definition.gridDefaults.put("columnGap", columnGap);
            this.definition.gridDefaults.put("rowGap", rowGap);
            return this;
        }

        public FormDefinitionBuilder mode(Mode mode) {
            this.definition.mode = (Integer) mode.wireValue();
            if (mode == Mode.DETAIL) {
                this.definition.readPretty = true;
            }
            return this;
        }

        public FormDefinitionBuilder readPretty(boolean readPretty) {
            this.definition.readPretty = readPretty;
            return this;
        }

        public FormDefinitionBuilder initialValues(Map<String, Object> initialValues) {
            this.definition.initialValues = initialValues;
            return this;
        }

        public FormDefinitionBuilder modelShape(Map<String, Object> modelShape) {
            this.definition.modelShape = modelShape;
            return this;
        }

        public FormDefinitionBuilder scopeKey(String scopeKey) {
            this.definition.scopeKeys.add(scopeKey);
            return this;
        }

        public FormDefinitionBuilder scopeKeys(String... scopeKeys) {
            this.definition.scopeKeys.addAll(Arrays.asList(scopeKeys));
            return this;
        }

        public FormDefinitionBuilder componentKey(String componentKey) {
            this.definition.componentKeys.add(componentKey);
            return this;
        }

        public FormDefinitionBuilder components(String... componentKeys) {
            this.definition.componentKeys.addAll(Arrays.asList(componentKeys));
            return this;
        }

        public FormDefinitionBuilder detailOption(DetailOptionKey key, Object value) {
            this.definition.detailOptions.put(key.wireValue().toString(), unwrap(value));
            return this;
        }

        public FormDefinitionBuilder detailOption(String key, Object value) {
            this.definition.detailOptions.put(key, unwrap(value));
            return this;
        }

        public FormDefinitionBuilder detailOptions(Map<String, Object> detailOptions) {
            this.definition.detailOptions.putAll(detailOptions);
            return this;
        }

        public FormDefinitionBuilder effect(FormEffect effect) {
            this.definition.formEffects.add(effect);
            return this;
        }

        public FormDefinitionBuilder effects(FormEffect... effects) {
            this.definition.formEffects.addAll(Arrays.asList(effects));
            return this;
        }

        public FormDefinitionBuilder fieldEffect(FieldEffect fieldEffect) {
            this.definition.fieldEffects.add(fieldEffect);
            return this;
        }

        public FormDefinitionBuilder fieldEffects(FieldEffect... fieldEffects) {
            this.definition.fieldEffects.addAll(Arrays.asList(fieldEffects));
            return this;
        }

        public FormDefinitionBuilder node(NodeBuilder builder) {
            this.gridNode.property(builder.name(), builder.build());
            return this;
        }

        public FormDefinitionBuilder nodes(NodeBuilder... builders) {
            for (NodeBuilder builder : builders) {
                node(builder);
            }
            return this;
        }

        public YssFormDefinition build() {
            return this.definition;
        }

        public Map<String, Object> buildMap() {
            return this.definition.toMap();
        }
    }

    public static final class NodeBuilder {
        private final String name;
        private final SchemaNode node;

        private NodeBuilder(String name, SchemaNode node) {
            this.name = name;
            this.node = node;
        }

        public String name() {
            return name;
        }

        public SchemaNode build() {
            return node;
        }

        public NodeBuilder title(String title) {
            node.title(title);
            return this;
        }

        public NodeBuilder required() {
            node.required(true);
            return this;
        }

        public NodeBuilder required(boolean required) {
            node.required(required);
            return this;
        }

        public NodeBuilder decorator(Decorator decorator) {
            node.decorator(decorator);
            return this;
        }

        public NodeBuilder decorator(String decorator) {
            node.decorator(decorator);
            return this;
        }

        public NodeBuilder component(Component component) {
            node.component(component);
            return this;
        }

        public NodeBuilder component(String component) {
            node.component(component);
            return this;
        }

        public NodeBuilder componentProp(String key, Object value) {
            node.componentProp(key, value);
            return this;
        }

        public NodeBuilder decoratorProp(String key, Object value) {
            node.decoratorProp(key, value);
            return this;
        }

        public NodeBuilder placeholder(String placeholder) {
            node.componentProp("placeholder", placeholder);
            return this;
        }

        public NodeBuilder tooltip(String tooltip) {
            node.decoratorProp("tooltip", tooltip);
            return this;
        }

        public NodeBuilder gridSpan(int gridSpan) {
            node.decoratorProp("gridSpan", gridSpan);
            return this;
        }

        public NodeBuilder visibleExpr(String expression) {
            node.xVisible(expression);
            return this;
        }

        public NodeBuilder disabledExpr(String expression) {
            node.xDisabled(expression);
            return this;
        }

        public NodeBuilder reactions(Object reactions) {
            node.xReactions(reactions);
            return this;
        }

        public NodeBuilder reaction(Reaction reaction) {
            node.reaction(reaction);
            return this;
        }

        public NodeBuilder event(String eventName, String expression) {
            node.event(new EventBinding(eventName, expression));
            return this;
        }

        public NodeBuilder event(EventType eventType, String expression) {
            node.event(new EventBinding(eventType.wireValue().toString(), expression));
            return this;
        }

        public NodeBuilder event(EventBinding eventBinding) {
            node.event(eventBinding);
            return this;
        }

        public NodeBuilder validator(Validator validator) {
            node.validator(validator);
            return this;
        }

        public NodeBuilder validators(Validator... validators) {
            node.validators(Arrays.asList(validators));
            return this;
        }

        public NodeBuilder previewFormat(String expression) {
            node.previewFormat(expression);
            return this;
        }

        public NodeBuilder content(String content) {
            node.content(content);
            return this;
        }

        public NodeBuilder option(Object value, String label) {
            node.option(value, label);
            return this;
        }

        public NodeBuilder options(Option... options) {
            node.options(Arrays.asList(options));
            return this;
        }

        public NodeBuilder enumExpression(String expression) {
            node.setEnum(expression);
            return this;
        }

        public NodeBuilder remoteDict(DictConfig dictConfig) {
            node.remoteDict(dictConfig);
            return this;
        }

        public NodeBuilder property(String childName, SchemaNode childNode) {
            node.property(childName, childNode);
            return this;
        }
    }

    public static final class YssFormDefinition {
        private final YssSchema schema = new YssSchema();
        private Integer mode = (Integer) Mode.CREATE.wireValue();
        private Boolean readPretty = false;
        private Map<String, Object> initialValues = new LinkedHashMap<>();
        private Map<String, Object> modelShape = new LinkedHashMap<>();
        private final Map<String, Object> detailOptions = new LinkedHashMap<>();
        private final Map<String, Object> gridDefaults = new LinkedHashMap<>();
        private final List<String> scopeKeys = new ArrayList<>();
        private final List<String> componentKeys = new ArrayList<>();
        private final List<FormEffect> formEffects = new ArrayList<>();
        private final List<FieldEffect> fieldEffects = new ArrayList<>();

        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("schema", schema.toMap());
            putIfNotNull(result, "mode", mode);
            putIfNotNull(result, "readPretty", readPretty);
            putIfNotEmpty(result, "initialValues", initialValues);
            putIfNotEmpty(result, "modelShape", modelShape);
            putIfNotEmpty(result, "detailOptions", detailOptions);
            putIfNotEmpty(result, "gridDefaults", gridDefaults);
            putIfNotEmpty(result, "scopeKeys", scopeKeys);
            putIfNotEmpty(result, "componentKeys", componentKeys);
            putIfNotEmpty(result, "effects", convertNamedList(formEffects));
            putIfNotEmpty(result, "fieldEffects", convertNamedList(fieldEffects));
            return result;
        }
    }

    public static final class YssSchema {
        private final String type = SchemaType.OBJECT.wireValue().toString();
        private final Map<String, SchemaNode> properties = new LinkedHashMap<>();

        public YssSchema property(String name, SchemaNode node) {
            this.properties.put(name, node);
            return this;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("type", type);
            result.put("properties", convertProperties(properties));
            return result;
        }
    }

    public static final class SchemaNode {
        private String type;
        private String title;
        private Boolean required;
        private String xComponent;
        private String xDecorator;
        private final Map<String, Object> xComponentProps = new LinkedHashMap<>();
        private final Map<String, Object> xDecoratorProps = new LinkedHashMap<>();
        private Object xVisible;
        private Object xDisabled;
        private Object xReactions;
        private Object xEnum;
        private Object xValidator;
        private String xPreviewFormat;
        private String xContent;
        private final Map<String, SchemaNode> properties = new LinkedHashMap<>();
        private DictConfig dictConfig;

        public static SchemaNode of(SchemaType type) {
            return of(type.wireValue().toString());
        }

        public static SchemaNode of(String type) {
            SchemaNode node = new SchemaNode();
            node.type = type;
            return node;
        }

        public SchemaNode title(String title) {
            this.title = title;
            return this;
        }

        public SchemaNode required(Boolean required) {
            this.required = required;
            return this;
        }

        public SchemaNode component(Component xComponent) {
            this.xComponent = xComponent.wireValue().toString();
            return this;
        }

        public SchemaNode component(String xComponent) {
            this.xComponent = xComponent;
            return this;
        }

        public SchemaNode decorator(Decorator xDecorator) {
            this.xDecorator = xDecorator.wireValue().toString();
            return this;
        }

        public SchemaNode decorator(String xDecorator) {
            this.xDecorator = xDecorator;
            return this;
        }

        public SchemaNode componentProp(String key, Object value) {
            this.xComponentProps.put(key, unwrap(value));
            return this;
        }

        public SchemaNode removeComponentProp(String key) {
            this.xComponentProps.remove(key);
            return this;
        }

        public SchemaNode decoratorProp(String key, Object value) {
            this.xDecoratorProps.put(key, unwrap(value));
            return this;
        }

        public SchemaNode xVisible(Object xVisible) {
            this.xVisible = unwrap(xVisible);
            return this;
        }

        public SchemaNode xDisabled(Object xDisabled) {
            this.xDisabled = unwrap(xDisabled);
            return this;
        }

        public SchemaNode xReactions(Object xReactions) {
            this.xReactions = unwrap(xReactions);
            return this;
        }

        public SchemaNode reaction(Reaction reaction) {
            if (!(xReactions instanceof List<?>)) {
                xReactions = new ArrayList<Map<String, Object>>();
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> reactions = (List<Map<String, Object>>) xReactions;
            reactions.add(reaction.toMap());
            return this;
        }

        public SchemaNode event(EventBinding eventBinding) {
            this.xComponentProps.put(eventBinding.name, eventBinding.expression);
            return this;
        }

        public SchemaNode validator(Validator validator) {
            if (!(xValidator instanceof List<?>)) {
                xValidator = new ArrayList<Map<String, Object>>();
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> validators = (List<Map<String, Object>>) xValidator;
            validators.add(validator.toMap());
            return this;
        }

        public SchemaNode validators(List<Validator> validators) {
            List<Map<String, Object>> result = new ArrayList<>();
            for (Validator validator : validators) {
                result.add(validator.toMap());
            }
            this.xValidator = result;
            return this;
        }

        public SchemaNode previewFormat(String expression) {
            this.xPreviewFormat = expression;
            return this;
        }

        public SchemaNode setEnum(Object xEnum) {
            this.xEnum = unwrap(xEnum);
            return this;
        }

        public SchemaNode content(String xContent) {
            this.xContent = xContent;
            return this;
        }

        public SchemaNode option(Object value, String label) {
            if (!(xEnum instanceof List<?>)) {
                xEnum = new ArrayList<Map<String, Object>>();
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> options = (List<Map<String, Object>>) xEnum;
            Map<String, Object> option = new LinkedHashMap<>();
            option.put("label", label);
            option.put("value", value);
            options.add(option);
            return this;
        }

        public SchemaNode options(List<Option> options) {
            List<Map<String, Object>> values = new ArrayList<>();
            for (Option option : options) {
                values.add(option.toMap());
            }
            this.xEnum = values;
            return this;
        }

        public SchemaNode remoteDict(DictConfig dictConfig) {
            this.dictConfig = dictConfig;
            this.xEnum = dictConfig.toEnumExpression();
            if (dictConfig.previewFormatExpression != null) {
                this.xPreviewFormat = dictConfig.previewFormatExpression;
            }
            return this;
        }

        public SchemaNode property(String name, SchemaNode node) {
            this.properties.put(name, node);
            return this;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            putIfNotNull(result, "type", type);
            putIfNotNull(result, "title", title);
            putIfNotNull(result, "required", required);
            putIfNotNull(result, "x-component", xComponent);
            putIfNotNull(result, "x-decorator", xDecorator);
            putIfNotEmpty(result, "x-component-props", xComponentProps);
            putIfNotEmpty(result, "x-decorator-props", xDecoratorProps);
            putIfNotNull(result, "x-visible", xVisible);
            putIfNotNull(result, "x-disabled", xDisabled);
            putIfNotNull(result, "x-reactions", xReactions);
            putIfNotNull(result, "enum", xEnum);
            putIfNotNull(result, "x-validator", xValidator);
            putIfNotNull(result, "x-preview-format", xPreviewFormat);
            putIfNotNull(result, "x-content", xContent);
            if (dictConfig != null) {
                result.put("x-yss-dict", dictConfig.toMap());
            }
            if (!properties.isEmpty()) {
                result.put("properties", convertProperties(properties));
            }
            return result;
        }
    }

    public static final class EventBinding {
        private final String name;
        private final String expression;

        public EventBinding(String name, String expression) {
            this.name = name;
            this.expression = expression;
        }
    }

    public static final class DictConfig {
        private final String dictCode;
        private final String optionsScopeKey;
        private String labelKey = "label";
        private String valueKey = "value";
        private String previewFormatExpression;
        private String optionsExpression;

        public DictConfig(String dictCode, String optionsScopeKey) {
            this.dictCode = dictCode;
            this.optionsScopeKey = optionsScopeKey;
        }

        public DictConfig labelKey(String labelKey) {
            this.labelKey = labelKey;
            return this;
        }

        public DictConfig valueKey(String valueKey) {
            this.valueKey = valueKey;
            return this;
        }

        public DictConfig optionsExpression(String optionsExpression) {
            this.optionsExpression = optionsExpression;
            return this;
        }

        public DictConfig previewFormat(String previewFormatExpression) {
            this.previewFormatExpression = previewFormatExpression;
            return this;
        }

        public String toEnumExpression() {
            if (optionsExpression != null) {
                return optionsExpression;
            }
            return "{{ dicts." + optionsScopeKey + " }}";
        }

        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("dictCode", dictCode);
            result.put("optionsScopeKey", optionsScopeKey);
            result.put("labelKey", labelKey);
            result.put("valueKey", valueKey);
            putIfNotNull(result, "previewFormatExpression", previewFormatExpression);
            putIfNotNull(result, "optionsExpression", optionsExpression);
            return result;
        }
    }

    public static final class Validator {
        private final Map<String, Object> attributes = new LinkedHashMap<>();

        public static Validator required(String message) {
            Validator validator = new Validator();
            validator.attributes.put("required", true);
            putIfNotNull(validator.attributes, "message", message);
            return validator;
        }

        public static Validator async(String triggerType, String expression, String message) {
            Validator validator = new Validator();
            validator.attributes.put("triggerType", triggerType);
            validator.attributes.put("validator", expression);
            putIfNotNull(validator.attributes, "message", message);
            validator.attributes.put("async", true);
            return validator;
        }

        public Validator pattern(String pattern) {
            attributes.put("pattern", pattern);
            return this;
        }

        public Validator max(int max) {
            attributes.put("max", max);
            return this;
        }

        public Validator min(int min) {
            attributes.put("min", min);
            return this;
        }

        public Validator message(String message) {
            attributes.put("message", message);
            return this;
        }

        public Map<String, Object> toMap() {
            return attributes;
        }
    }

    public static final class Reaction {
        private final List<String> dependencies = new ArrayList<>();
        private final Map<String, Object> fulfillState = new LinkedHashMap<>();
        private final Map<String, Object> otherwiseState = new LinkedHashMap<>();
        private String whenExpression;
        private String runExpression;

        public Reaction dependency(String dependency) {
            this.dependencies.add(dependency);
            return this;
        }

        public Reaction dependencies(String... dependencies) {
            this.dependencies.addAll(Arrays.asList(dependencies));
            return this;
        }

        public Reaction when(String whenExpression) {
            this.whenExpression = whenExpression;
            return this;
        }

        public Reaction run(String runExpression) {
            this.runExpression = runExpression;
            return this;
        }

        public Reaction fulfillState(String key, Object value) {
            this.fulfillState.put(key, unwrap(value));
            return this;
        }

        public Reaction otherwiseState(String key, Object value) {
            this.otherwiseState.put(key, unwrap(value));
            return this;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            putIfNotEmpty(result, "dependencies", dependencies);
            putIfNotNull(result, "when", whenExpression);
            putIfNotNull(result, "run", runExpression);
            if (!fulfillState.isEmpty()) {
                Map<String, Object> fulfill = new LinkedHashMap<>();
                fulfill.put("state", fulfillState);
                result.put("fulfill", fulfill);
            }
            if (!otherwiseState.isEmpty()) {
                Map<String, Object> otherwise = new LinkedHashMap<>();
                otherwise.put("state", otherwiseState);
                result.put("otherwise", otherwise);
            }
            return result;
        }
    }

    public static final class FormEffect implements HasMapValue {
        private final String type;
        private final String expression;

        private FormEffect(String type, String expression) {
            this.type = type;
            this.expression = expression;
        }

        public static FormEffect of(FormEffectType type, String expression) {
            return new FormEffect(type.wireValue().toString(), expression);
        }

        public static FormEffect of(String type, String expression) {
            return new FormEffect(type, expression);
        }

        @Override
        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("type", type);
            result.put("expression", expression);
            return result;
        }
    }

    public static final class FieldEffect implements HasMapValue {
        private final String type;
        private final String fieldPattern;
        private final String expression;

        private FieldEffect(String type, String fieldPattern, String expression) {
            this.type = type;
            this.fieldPattern = fieldPattern;
            this.expression = expression;
        }

        public static FieldEffect of(FieldEffectType type, String fieldPattern, String expression) {
            return new FieldEffect(type.wireValue().toString(), fieldPattern, expression);
        }

        @Override
        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("type", type);
            result.put("fieldPattern", fieldPattern);
            result.put("expression", expression);
            return result;
        }
    }

    public static final class Option {
        private final Object value;
        private final String label;

        public Option(Object value, String label) {
            this.value = value;
            this.label = label;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("label", label);
            result.put("value", value);
            return result;
        }
    }

    private static Map<String, Object> convertProperties(Map<String, SchemaNode> properties) {
        if (properties == null || properties.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, SchemaNode> entry : properties.entrySet()) {
            result.put(entry.getKey(), entry.getValue().toMap());
        }
        return result;
    }

    private static List<Map<String, Object>> convertNamedList(List<? extends HasMapValue> values) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (HasMapValue value : values) {
            result.add(value.toMap());
        }
        return result;
    }

    private static Object unwrap(Object value) {
        if (value instanceof WireValue) {
            return ((WireValue) value).wireValue();
        }
        return value;
    }

    private static void putIfNotNull(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }

    private static void putIfNotEmpty(Map<String, Object> map, String key, Map<String, Object> value) {
        if (value != null && !value.isEmpty()) {
            map.put(key, value);
        }
    }

    private static void putIfNotEmpty(Map<String, Object> map, String key, List<?> value) {
        if (value != null && !value.isEmpty()) {
            map.put(key, value);
        }
    }
}
