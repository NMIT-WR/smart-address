# HERE Discover Search API Provider - Product Requirements Document

## Overview

This document outlines the implementation of a HERE Discover Search API provider for the smart-address service, following the BMAD methodology.

## Problem Statement

The smart-address service currently only supports Nominatim (OpenStreetMap) as a geocoding provider. To improve address suggestion quality and provide redundancy, we need to integrate the HERE Discover Search API as an additional provider.

## Goals

1. Implement a HERE Discover API provider following existing patterns
2. Support all `AddressQuery` fields (text, limit, countryCode, locale)
3. Map HERE API responses to the standard `AddressSuggestion` format
4. Enable flexible configuration (API key, default location bias, limits)
5. Maintain type safety using Effect/Schema

## Non-Goals

- Implementing HERE Autosuggest (different endpoint, optimized for typeahead)
- Implementing HERE Geocode (structured address lookup)
- Implementing HERE Reverse Geocode
- Supporting HERE OAuth2 authentication (API key only)

## Technical Specification

### HERE Discover API Details

**Endpoint**: `https://discover.search.hereapi.com/v1/discover`

**Authentication**: API key via `apiKey` query parameter

**Request Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `apiKey` | Yes | HERE API key |
| `q` | Yes | Free-text search query |
| `at` | No | Center point for search (lat,lng) - optional geographic bias |
| `in` | No | Country filter (countryCode:XXX) |
| `limit` | No | Max results (1-100, default 20) |
| `lang` | No | Response language (BCP 47) |
| `show` | No | Additional fields (use `details`) |

*Note: `at` is optional - omitting it gives global search without geographic bias

**Response Structure**:

```json
{
  "items": [
    {
      "title": "Berlin, Germany",
      "id": "here:pds:place:276u33db-...",
      "resultType": "locality",
      "address": {
        "label": "Berlin, Germany",
        "countryCode": "DEU",
        "countryName": "Germany",
        "stateCode": "BE",
        "state": "Berlin",
        "city": "Berlin",
        "postalCode": "10117",
        "street": "Unter den Linden",
        "houseNumber": "1"
      },
      "position": {
        "lat": 52.52,
        "lng": 13.405
      },
      "scoring": {
        "queryScore": 1.0,
        "fieldScore": { ... }
      }
    }
  ]
}
```

### Implementation Plan

#### 1. HereConfig Type

```typescript
export type HereConfig = {
  readonly apiKey: string
  readonly defaultAt?: { lat: number; lng: number }
  readonly defaultLimit?: number
}
```

#### 2. Schema Definitions
- `HereAddressSchema` - Address object from HERE
- `HerePositionSchema` - Lat/lng coordinates
- `HereScoringSchema` - Query scoring info
- `HereItemSchema` - Single result item
- `HereResponseSchema` - Full response with items array

#### 3. Parser Functions
- `addressFromHere()` - Map HERE address to AddressParts
- `metadataFromHere()` - Extract position, resultType, scoring
- `toAddressSuggestion()` - Convert HERE item to AddressSuggestion
- `parseHereResponse()` - Decode and transform full response

#### 4. Request Builder
- Build URL with query parameters
- Handle country code mapping (ISO 3166-1 alpha-2 to alpha-3)
- Set Accept-Language header from locale

#### 5. Provider Factory

```typescript
export const makeHereProvider = (config: HereConfig) =>
  makeAddressProvider("here", (query) => ...)
```

### File Structure

```text
packages/integrations/
├── src/
│   ├── here.ts          # HERE provider implementation
│   └── ...
├── test/
│   └── here.test.ts     # Unit tests
└── package.json         # Add export for "./here"
```

### Service Integration

Update `apps/service-bun/src/service.ts`:
- Add `HereConfig` to `AddressSuggestorConfig`
- Create HERE provider with timeout wrapper
- Add to provider plan stages

### Environment Variables

| Variable | Description |
|----------|-------------|
| `HERE_API_KEY` | Required HERE API key |
| `HERE_DEFAULT_LAT` | Optional latitude for search bias |
| `HERE_DEFAULT_LNG` | Optional longitude for search bias |
| `HERE_DEFAULT_LIMIT` | Default result limit |
| `HERE_RATE_LIMIT_MS` | Rate limit between requests |

## Success Criteria

1. HERE provider passes all unit tests
2. Provider correctly maps responses to AddressSuggestion format
3. Error handling works for API failures
4. Rate limiting can be applied
5. Timeout wrapper can be applied
6. Integration with service-bun works correctly

## Implementation Steps

1. [x] Research HERE Discover API documentation
2. [x] Create HERE provider schema definitions
3. [x] Implement parser functions
4. [x] Implement makeHereProvider factory
5. [x] Add export to integrations package.json
6. [x] Write unit tests
7. [x] Wire into service-bun
8. [x] Test end-to-end
