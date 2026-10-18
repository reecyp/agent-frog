// Shared by the client sidebar toggle and the server root layout, so it can't live in Nav.tsx ("use client").
export const NAV_KEY = "agentfrog.nav";

/** Runs in <head> before first paint so a collapsed sidebar never flashes open. */
export const NAV_INIT_SCRIPT = `try{if(localStorage.getItem("${NAV_KEY}")==="collapsed")document.documentElement.dataset.nav="collapsed"}catch(e){}`;
