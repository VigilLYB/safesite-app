import { createContext, useContext, type ReactNode } from "react";

/**
 * A slot the app shell can fill so EVERY page header shows the same extra control (for example the
 * manager's Report button) without each screen knowing about it, and without the UI primitives
 * importing any auth or feature code.
 */
const HeaderExtraContext = createContext<ReactNode>(null);

export const HeaderExtraProvider = HeaderExtraContext.Provider;
export const useHeaderExtra = (): ReactNode => useContext(HeaderExtraContext);
