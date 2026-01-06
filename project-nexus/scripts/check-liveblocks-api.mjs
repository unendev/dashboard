import { Liveblocks } from "@liveblocks/node";

const key = "sk_placeholder"; 

const client = new Liveblocks({ secret: key });

console.log("Methods on Liveblocks instance:");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));