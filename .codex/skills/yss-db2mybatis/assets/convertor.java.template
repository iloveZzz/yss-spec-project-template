package ${base_package}.repository.convertor;

import ${model_pkg}.${domain_name};
import ${base_package}.repository.entity.${domain_name}PO;
import org.mapstruct.Mapper;
import org.mapstruct.NullValueCheckStrategy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.factory.Mappers;

import java.util.List;

@Mapper(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE, nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS)
public interface ${domain_name}Convertor {

    ${domain_name}Convertor INSTANCE = Mappers.getMapper(${domain_name}Convertor.class);

    ${domain_name}PO toPO(${domain_name} source);

    ${domain_name} toDomain(${domain_name}PO source);

    List<${domain_name}> toDomainList(List<${domain_name}PO> source);
}
