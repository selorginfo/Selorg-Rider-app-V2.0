# COMPONENT_MAP.md — Selorg Rider App

How every HTML construct in `Selorg Rider.dc.html` maps to a React Native primitive / reusable
component. The DC framework's `sc-if` / `sc-for` / `{{ }}` bindings become plain React
conditionals, `.map()`, and props.

## Primitive mapping

| HTML / CSS | React Native |
|---|---|
| `<div>` layout box | `<View>` |
| `<div class="selscroll">` scroll area | `<ScrollView>` / `<FlatList>` (with `showsVerticalScrollIndicator={false}`) |
| `<span>` / `<div>` text | `<Text>` |
| `<button onClick>` / `<div onClick>` | `<Pressable>` (via `PrimaryButton` / `OutlineButton` / `PressableRow`) |
| `<input type=text/numeric/email>` | `<TextInput>` |
| `<textarea>` | `<TextInput multiline>` |
| `<img src="assets/…">` | `<Image source={require(...)}>` |
| inline `<svg>` icons | `react-native-svg` components in `src/components/common/Icons.tsx` |
| `<sc-if value>` | `{cond && <.../>}` or ternary |
| `<sc-for list as>` | `list.map(item => <.../>)` or `FlatList data` |
| CSS `display:flex` (default column? no — row) | `flexDirection` — RN default is `column`, HTML default `row`; every flex row gets explicit `flexDirection:'row'` |
| CSS `gap` | `gap` (RN 0.71+) — kept |
| CSS `font: 700 14px Inter` shorthand | `{ fontFamily:'Inter-Bold'|..., fontSize:14, fontWeight:'700' }` via `text()` helper in `theme/typography.ts` |
| CSS `box-shadow` | iOS `shadowColor/Opacity/Radius/Offset` + Android `elevation` via `shadow()` helper |
| CSS `border-radius` | `borderRadius` |
| CSS `linear-gradient(...)` | stacked `<View>` layers approximating the gradient (no extra native lib) — `GradientView` component with 2–3 blended overlays; **or** solid mid-tone fallback |
| CSS `position:absolute; inset:0` | `StyleSheet.absoluteFill` |
| CSS `animation: selUp/selPop/selPulse` | `Animated` — `useScreenEnter()` hook, `<PopIn>`, `<PulseDot>` |
| `::-webkit-scrollbar { width:0 }` | `showsVerticalScrollIndicator={false}` |
| phone frame (`402×858` bezel) | **dropped** — screens fill the device inside `<SafeAreaView>` |
| CSS media query | `useWindowDimensions()` (layouts already fluid; grids use `flex`/percentage) |

## Reusable components (`src/components/`)

### buttons/
| Component | Replaces | Props |
|---|---|---|
| `PrimaryButton` | green pill `primaryBtn(enabled)` buttons | `label, onPress, disabled, style, variant('green'|'purple'|'white')` |
| `OutlineButton` | bordered secondary buttons ("Deposit cash to Selorg", "Cancel order") | `label, onPress, tone('green'|'danger'|'neutral')` |
| `TextButton` | "‹ Back", "Autofill demo code", link-style text | `label, onPress, color` |
| `SegmentedControl` | login method switch, filter-tab strips | `options, value, onChange, variant` |

### cards/
| Component | Replaces |
|---|---|
| `Card` | white rounded `#EDEFF2`-bordered surface with soft shadow |
| `StatCard` | Home 2×2 perf cards, Accept 3-up stat cards |
| `StatTile` | Profile / BulkHistoryDetail 3-up tiles |
| `OrderCard` | Orders "Available to Accept" card (payout, timeline, pill stats, Accept button) |
| `ActiveOrderCard` | Orders / Home resume card |
| `HistoryCard` | History delivered card |
| `SlotCard` | Shifts slot row |
| `GradientHeroCard` | Earnings "THIS WEEK", FloatCash "CASH IN HAND", incentive card |
| `PickupDropTimeline` | green→red dotted route mini-timeline (Orders/Accept) |

### inputs/
| Component | Replaces |
|---|---|
| `PhoneInput` | "+91" prefix + numeric field |
| `LabeledInput` | onboarding text fields |
| `OtpInput` | 4-box OTP entry w/ focus mgmt |
| `SearchBar` | BulkAllStops search |
| `Checkbox` | bag / kit / bulk-load checklists |
| `RadioRow` | hub / pay-method / cancel-reason / language / shift / bulk-exception rows |
| `ToggleSwitch` | Home online toggle, Settings toggles |

### headers/
| Component | Replaces |
|---|---|
| `ScreenHeader` | "‹ back + title (+ subtitle)" bar used on most secondary screens |
| `GradientHeader` | Profile / Accept / BulkOverview / BulkActive coloured headers |

### feedback/
| Component | Replaces |
|---|---|
| `Banner` | info (ⓘ), warning (⚠️/💡), success (✓), contact-note banners |
| `StatusBadge` | "PRIORITY", "✓ Delivered", "Verified", bulk stop status pills, "● Pending" |
| `PulseDot` | live-status pulsing dot |
| `PopIn` | success check-mark scale-in wrapper |
| `EmptyState` | "No new orders", "No stops match", offline card |
| `SuccessScreen` | Complete / ObDone / BulkComplete full-bleed layouts |
| `ProgressBar` | incentive progress, onboarding 5-segment bar, bulk progress |
| `MapPlaceholder` | gradient + dashed-route SVG panels (Travel / Nav / BulkActive) |
| `StopRail` | BulkActive horizontal numbered chip rail |

### bottomSheets/
| Component | Replaces |
|---|---|
| `BottomSheet` | shared shell: scrim `<Pressable>` + slide-up `<View>` + grabber, `Modal` transparent |
| `ShiftSelectSheet`, `DepositSheet`, `CancelOrderSheet`, `LanguageSheet`, `BulkExceptionSheet` | the 5 overlays |

### navigation/
| Component | Replaces |
|---|---|
| `BottomTabBar` | custom tab bar matching HTML (filled chip active state, inline SVG icons) |

### common/
| Component | Replaces |
|---|---|
| `Icons.tsx` | every inline `<svg>` — `HomeIcon, BoxIcon, BarChartIcon, ClockIcon, UserIcon, CheckIcon, ChevronRight, WifiIcon, BatteryIcon, SignalIcon, RouteMarkers, …` |
| `Screen.tsx` | `SafeAreaView` + status-bar tint + optional scroll + screen-enter animation wrapper |
| `EmojiIcon.tsx` | wraps the emoji glyphs the design uses as icons (🪪 💳 🚗 🛍 🏬 📍 …) at a fixed size so they render consistently |

## State → RN

The single DC `Component` state object becomes `RiderContext` (`src/store/RiderContext.tsx`) — a
`useReducer` store exposing typed selectors + action creators, wrapped by `<RiderProvider>` in
`App.tsx`. `renderVals()`'s derived values become memoized selector functions
(`src/store/selectors.ts`), and `bulkData()` becomes `selectBulk(state)`.

Static design data (`ORDERS`, `BULK_ORDERS`, `HUBS`, `DOC_LIST`, `KIT_LIST`, `VEHICLES`, `SLOTS`,
`ITEMS`, `week`, `history`, `privacy`, `terms`, `faqs`, `languages`) → typed modules in
`src/mock/` fronted by service interfaces in `src/services/api/` so a real backend can replace them
without touching UI.

## `setTimeout` behaviours preserved
- `enableLocation()` — 1100 ms → `locStage: 'ready'`
- `sendChat()` — 900 ms → canned support reply
- (screens use `useEffect` timers with cleanup)
