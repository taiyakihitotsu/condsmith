minimal formatter for [cion](https://github.com/taiyakihitotsu/cion).

```typescript
type A<
  S
, V extends string = ""> =
  S extends string
    ? V extends string
      ? 1
    : 1 extends number
      ? { x: 11
        , y: 12 }
    : { a: 1
      , b: 2
      , c: { d: { dd: 1
                , de: 2 }
           , eav: { ee: 55
                  , df: 56
                  , de: 53
                  , jj: { akd: 1
                        , aaa: 4 } } } }
  : false extends false
    ? [0,1,2,3]
  : '2' extends 2
    ? 2 extends number
      ? 'number'
    : false
  : false extends boolean
    ? 11
  : 22

export type B = boolean
```

- ignored: tuples, oneliner.
