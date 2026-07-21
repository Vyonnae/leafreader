import { createApp } from "vue"
import RootApp from "./RootApp.vue"
import router from "./router"
import "./index.css"

createApp(RootApp).use(router).mount("#root")
