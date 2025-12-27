# AI‑friendly docs

Dokumentace je psaná tak, aby ji AI i lidé pochopili rychle.

## Co tady znamená “AI‑friendly”

- Model by měl umět zodpovědět “How do I…?” citací jedné sekce.
- Příklady mají být copy/paste a obsahovat potřebný kontext.
- “Reference” má být dostatečně kompletní, aby šel generovat správný kód bez hádání.

Principy:

- Začít cílem a očekávaným výsledkem.
- Explicitně uvést vstupy, výstupy a omezení.
- Přidat kopírovatelné příklady a minimální varianty.
- Stabilní nadpisy pro snadné vyhledávání.
- Striktní Diataxis struktura (tutorials, how‑to, reference, explanation).

## Konvence používané na většině stránek

- `## Cíl`: čeho dosáhnete.
- `## Požadavky`: co je potřeba předem.
- `## Vstupy` / `## Výstup` / `## Chyby`: explicitní kontrakt.
- `## Viz také`: predikovatelné odkazy.

## Při změně kódu

Pokud se změní API nebo chování:

- Aktualizujte odpovídající *reference* stránku (EN + CS).
- Pokud se mění chování/trade‑offy, přidejte krátkou poznámku do relevantního *explanation*.
