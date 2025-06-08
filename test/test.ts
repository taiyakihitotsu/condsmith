type SPad<
  S extends string> =
  S extends ` ${infer SS}`
    ? SS
  : ` ${S}`//test//test//test//test

namespace Compiler {
export type SPad<
  S extends string
, T extends numbur> =
  S extends ` ${infer SS}`
    ? SS
  : ` ${S}`//test//test//test//test
}
