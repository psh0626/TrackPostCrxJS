const myUrl = new URL("https://gcss-uat.ipc.be/ui-gtw/api/workflows?");
myUrl.searchParams.append("view", "TODOS");
myUrl.searchParams.append("products", "EMS,EXPRES,REG,INS,UPU,PREMIUM,STAND2,STAND30");
myUrl.searchParams.append("sort_by", "DUE_DATE");
myUrl.searchParams.append("sort_direction", "ASC");
myUrl.searchParams.append("page", "1");
myUrl.searchParams.append("size", "500");
fetch(myUrl.toString());
fetch(
    "https://gcss-uat.ipc.be/ui-gtw/api/workflows?view=TODOS&products=EMS,EXPRES,REG,INS,UPU,PREMIUM,STAND2,STAND30&sort_by=DUE_DATE&sort_direction=ASC&page=1&size=10",
);
