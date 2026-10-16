/*
 * Next generates PageProps<"/route"> and LayoutProps<"/route"> as globals, typing
 * params from the route's segments. The same mapping, by template literal:
 * [id] is a string, [...rest] a string[], [[...rest]] an optional string[].
 */
type WsParamsOf<R extends string> = R extends `${string}[[...${infer K}]]${infer Rest}`
  ? { [P in K]?: string[] } & WsParamsOf<Rest>
  : R extends `${string}[...${infer K}]${infer Rest}`
    ? { [P in K]: string[] } & WsParamsOf<Rest>
    : R extends `${string}[${infer K}]${infer Rest}`
      ? { [P in K]: string } & WsParamsOf<Rest>
      : unknown;

declare global {
  type PageProps<Route extends string = string> = {
    params: Promise<WsParamsOf<Route>>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  };
  type LayoutProps<Route extends string = string> = {
    children: import("react").ReactNode;
    params: Promise<WsParamsOf<Route>>;
  };
}

export {};
