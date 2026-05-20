## Plan de cambios

Voy a abordar 10 mejoras agrupadas por área. Por su tamaño, propongo este plan antes de implementar para que confirmes el alcance.

### 1. Desempates en Fase de Grupos (triple empate)
Actualizar la lógica de clasificación en `tournamentService.ts` / `tournamentEngine.ts` para aplicar, cuando haya 3+ equipos empatados a puntos en el mismo grupo:
1. Puntos en enfrentamientos directos entre los implicados
2. Diferencia de goles general del grupo
3. Goles a favor en todos los partidos del grupo

### 2. Panel Mesa — Cronómetro visible al iniciar
En `MesaMatchPanel.tsx` y/o `MatchCard.tsx` mostrar el `MatchTimer` también cuando el mesa está controlando el partido (hoy solo aparece "En vivo" sin tiempo).

### 3. Panel Mesa — Botones explícitos por partes
Para partidos con `match_halves = 2` reemplazar el actual Play/Pause por:
- "Iniciar Primera Parte"
- "Finalizar Primera Parte"
- "Iniciar Segunda Parte"
- "Finalizar Partido"

Para partidos de 1 tiempo: "Iniciar Partido" / "Finalizar Partido". Se guarda `started_at` y `status` en la BD.

### 4. Botón "Partido sin iniciar" (reset total)
Añadir junto a Reanudar/Reiniciar/Editar resultado un botón que devuelva el partido a estado inicial: `status='scheduled'`, `started_at=null`, `home_score=null`, `away_score=null`, borrado de goles/tarjetas/MVP de ese partido. Con confirmación.

### 5. Clasificaciones en "Torneo en Vivo"
En `LiveTournamentPage.tsx`, suscribirse en tiempo real a `matches` y recalcular standings (mismo método que la pestaña Torneo) cuando cambien resultados.

### 6. Estado del torneo: "En juego" vs "Próximamente" / "Finalizado"
Centralizar una función `getTournamentStatus(event)` con zona Europe/Madrid:
- hoy entre `date` y `end_date` (inclusive) → "En juego"
- hoy < `date` → "Próximamente"
- hoy > `end_date` → "Finalizado"

Aplicarla en badges del torneo, página de detalle y `TournamentsPage`. En `TournamentsPage` añadir sección "Torneos en juego" por encima de "Próximos Torneos" cuando exista alguno.

### 7. Stats — incluir Fases Finales
En el cálculo de "Equipos más goleadores" y "Máximos goleadores", quitar el filtro por fase de grupos para que cuente cualquier `match_goal` del torneo (Grupos + Oro/Plata/Bronce).

### 8. Detalle de torneo — Quitar cartel grande inicial
En `TournamentDetailPage.tsx` eliminar/comprimir el hero del cartel para que al entrar se vean directamente resultados/clasificaciones. El cartel quedará accesible (miniatura o en pestaña dedicada/galería).

### 9. Patrocinadores — Asignación a torneos + categorías
- Migración: nueva tabla `sponsor_events (sponsor_id, event_id)`, y columna `tier` con valores `premium | oro | partner` (ya existe `tier`, sólo restringir/validar).
- UI en `SponsorManager.tsx`: selección múltiple de torneos al crear/editar, selector de categoría.
- `SponsorsPage.tsx`: agrupar visualmente por tier (Premium > Oro > Partner).

### 10. Banner rotatorio Premium+Oro entre grupos
En la vista de clasificaciones (Torneo y Torneo en Vivo), insertar cada 2 grupos un banner horizontal compacto que rote automáticamente los patrocinadores Premium y Oro **del torneo actual** (filtrando por `sponsor_events`).

---

### Detalles técnicos
- Migraciones nuevas: tabla `sponsor_events`, posible CHECK sobre `sponsors.tier`.
- Reset de partido: usar transacción lógica desde el cliente con permisos admin (delete goles/tarjetas/MVP requiere admin según RLS actual).
- Tiempo real ya activo en `matches`/`match_goals` por migración previa; reutilizar canales.
- Estado torneo: helper en `src/lib/` con `date-fns-tz` (Europe/Madrid).

### Orden de implementación sugerido
1, 5, 6, 8 (impacto visible inmediato) → 2, 3, 4 (panel mesa) → 7 (stats) → 9, 10 (patrocinadores).

¿Apruebas el plan o quieres ajustar algo (p. ej. dejar fuera algún punto o priorizar otro orden)?
