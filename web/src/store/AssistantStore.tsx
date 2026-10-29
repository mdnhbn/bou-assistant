import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { AssistantAction, AssistantState } from "./types";

const initialState: AssistantState = {
  characterId: "bou",
  mode: "3d",
  status: "idle",
  messages: [
    { id: "welcome", role: "assistant", text: "হাই, আমি Bou। আজ কী নিয়ে কথা বলতে চাও?", createdAt: Date.now() },
    { id: "hint", role: "assistant", text: "Gemini brain ও browser voice ব্যবহার করতে .env সেট করো।", createdAt: Date.now() + 1 },
  ],
};

function reducer(state: AssistantState, action: AssistantAction): AssistantState {
  switch (action.type) {
    case "set-character": return { ...state, characterId: action.characterId };
    case "set-mode": return { ...state, mode: action.mode };
    case "set-status": return { ...state, status: action.status };
    case "add-message": return { ...state, messages: [...state.messages, action.message] };
    case "update-message": return { ...state, messages: state.messages.map((message) => message.id === action.id ? { ...message, text: action.text } : message) };
    case "clear-messages": return { ...state, messages: [] };
    default: return state;
  }
}

interface StoreContextValue { state: AssistantState; dispatch: Dispatch<AssistantAction>; }
const StoreContext = createContext<StoreContextValue | null>(null);

export function AssistantStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useAssistantStore(): StoreContextValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useAssistantStore must be used inside AssistantStoreProvider");
  return value;
}
