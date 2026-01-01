import {
  NumberFromString,
  optional,
  Array as SchemaArray,
  Literal as SchemaLiteral,
  Number as SchemaNumber,
  Record as SchemaRecord,
  String as SchemaString,
  Struct,
  Union,
} from "effect/Schema";

export const AddressQuerySchema = Struct({
  text: SchemaString,
  limit: optional(Union(SchemaNumber, NumberFromString)),
  countryCode: optional(SchemaString),
  locale: optional(SchemaString),
  sessionToken: optional(SchemaString),
});

export const AddressPartsSchema = Struct({
  line1: optional(SchemaString),
  line2: optional(SchemaString),
  city: optional(SchemaString),
  region: optional(SchemaString),
  postalCode: optional(SchemaString),
  countryCode: optional(SchemaString),
});

export const AddressSuggestionSourceSchema = Struct({
  provider: SchemaString,
  kind: optional(Union(SchemaLiteral("public"), SchemaLiteral("internal"))),
  reference: optional(SchemaString),
});

export const AddressSuggestionSchema = Struct({
  id: SchemaString,
  label: SchemaString,
  address: AddressPartsSchema,
  score: optional(SchemaNumber),
  source: AddressSuggestionSourceSchema,
  metadata: optional(
    SchemaRecord({
      key: SchemaString,
      value: SchemaString,
    })
  ),
});

export const AddressSuggestionErrorSchema = Struct({
  provider: SchemaString,
  message: SchemaString,
});

export const AddressSuggestionResultSchema = Struct({
  suggestions: SchemaArray(AddressSuggestionSchema),
  errors: SchemaArray(AddressSuggestionErrorSchema),
});
