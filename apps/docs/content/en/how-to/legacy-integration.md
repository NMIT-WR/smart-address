# Integrate from legacy PHP

## Goal

Call the HTTP service from a framework-less PHP integration (e.g. legacy checkout).

## Prerequisites

- Service running (default `http://localhost:8787`).

## Example

```php
<?php
$base = 'http://localhost:8787/suggest';
$query = http_build_query([
  'text' => 'Vodičkova 20',
  'limit' => 5,
  'countryCode' => 'CZ',
  'strategy' => 'reliable'
]);

$ch = curl_init("$base?$query");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
$first = $data['suggestions'][0] ?? null;
?>
```

## Notes

- The API is plain JSON; no SDK is required.
- Keep `strategy` explicit if you want consistent behavior.
- Invalid payloads return `400` with `{ "error": "..." }`.

## See also

- [Service API reference](/reference/service-api)
