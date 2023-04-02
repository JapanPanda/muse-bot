import ytsr from "ytsr";

const { generateDependencyReport } = require("@discordjs/voice");

console.log(generateDependencyReport());
ytsr.getFilters("asdf").then(res => console.log(res));
