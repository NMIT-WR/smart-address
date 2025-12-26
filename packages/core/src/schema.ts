import * as Schema from "effect/Schema"

export const AddressQuerySchema = Schema.Struct({
  text: Schema.String,
  limit: Schema.optional(Schema.Union(Schema.Number, Schema.NumberFromString)),
  countryCode: Schema.optional(Schema.String),
  locale: Schema.optional(Schema.String),
  sessionToken: Schema.optional(Schema.String)
})

export const AddressPartsSchema = Schema.Struct({
  line1: Schema.optional(Schema.String),
  line2: Schema.optional(Schema.String),
  city: Schema.optional(Schema.String),
  region: Schema.optional(Schema.String),
  postalCode: Schema.optional(Schema.String),
  countryCode: Schema.optional(Schema.String)
})

export const AddressSuggestionSourceSchema = Schema.Struct({
  provider: Schema.String,
  kind: Schema.optional(Schema.Union(Schema.Literal("public"), Schema.Literal("internal"))),
  reference: Schema.optional(Schema.String)
})

export const AddressSuggestionSchema = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  address: AddressPartsSchema,
  score: Schema.optional(Schema.Number),
  source: AddressSuggestionSourceSchema,
  metadata: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.String
    })
  )
})

export const AddressSuggestionErrorSchema = Schema.Struct({
  provider: Schema.String,
  message: Schema.String
})

export const AddressSuggestionResultSchema = Schema.Struct({
  suggestions: Schema.Array(AddressSuggestionSchema),
  errors: Schema.Array(AddressSuggestionErrorSchema)
})
