# Integrate from legacy PHP

Goal: call the service from a framework-less PHP shop.

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

Notes:

- The API is plain JSON; no SDK is required.
- Keep `strategy` explicit if you want consistent behavior.
