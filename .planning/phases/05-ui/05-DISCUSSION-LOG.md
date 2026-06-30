# Phase 5: Комплаенс-UI - Discussion Log

> **Audit trail only.** Decisions captured in CONTEXT.md.

**Date:** 2026-06-30
**Phase:** 5-Комплаенс-UI
**Areas discussed:** KDV-отображение, Согласия-чекаут, Юр-страницы-набор, Юр-контент

---

## KDV (НДС 20%) отображение
**User's choice:** KDV-inclusive + ярлык «KDV Dahil» + инфо-строка «KDV (%20)» в итогах (вычисляется из brutto). Ставка 20% фикс.
Alternatives: только ярлык; уточнить у ARM налоговое поле.

## Согласия в чекауте
**User's choice:** Два обязательных чекбокса — KVKK + mesafeli satış/ön bilgilendirme, оба блокируют submit, со ссылками на юр-страницы.
Alternatives: один общий чекбокс; разделить на 3.

## Набор юр-страниц
**User's choice:** 5 страниц — KVKK aydınlatma, mesafeli satış sözleşmesi, iade/cayma hakkı, gizlilik, kullanım koşulları; под [locale], ссылки из футера + чекаута.
Alternatives: минимум 3; одна страница с разделами.

## Контент юр-страниц
**User's choice:** Заглушки (скелет + placeholder) с i18n-ключами (EN+TR); реальный юр-текст позже.
Alternatives: + черновые типовые TR-шаблоны.

## Claude's Discretion
Вёрстка KDV-ярлыка/строки; slug'и юр-страниц; структура placeholder-разделов; namespacing ключей.

## Deferred Ideas
Реальный юр-текст (юрист); категорийные ставки KDV; e-fatura/go-live комплаенс.
