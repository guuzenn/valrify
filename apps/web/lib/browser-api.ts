export const browserApiUrl=process.env.NEXT_PUBLIC_API_URL??"/api";
export const authSessionChangedEvent="valrify:auth-session-changed";
export const notificationsChangedEvent="valrify:notifications-changed";
export function notifyAuthSessionChanged(){window.dispatchEvent(new Event(authSessionChangedEvent));}
export function notifyNotificationsChanged(){window.dispatchEvent(new Event(notificationsChangedEvent));}
export async function browserApi<T>(path:string,init?:RequestInit){const response=await fetch(`${browserApiUrl}${path}`,{...init,credentials:"include",headers:init?.body instanceof FormData?init.headers:{"content-type":"application/json",...init?.headers}});const payload=await response.json().catch(()=>({})) as T&{message?:string};if(!response.ok)throw new Error(Array.isArray(payload.message)?payload.message.join(", "):payload.message??"Permintaan gagal.");return payload;}
