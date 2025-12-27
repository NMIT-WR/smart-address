# Integrace do legacy PHP

## Cíl

Volat HTTP službu z framework‑less PHP integrace (např. legacy checkout).

## Požadavky

- Běžící služba (default `http://localhost:8787`).

## Příklad

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

## Poznámky

- API je čisté JSON, SDK není potřeba.
- Strategie nastavte explicitně, pokud chcete stabilní chování.
- Nevalidní payload vrací `400` s `{ "error": "..." }`.

## Viz také

- [Service API reference](/cs/reference/service-api)
