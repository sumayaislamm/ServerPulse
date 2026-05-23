import app from "./app"
import config from "./config/env"
import { initDB } from "./db";

const main = ()=>{
    initDB();
    app.listen(config.port, () => {
    console.log(`App listening on port ${config.port}`)
})
}

main();