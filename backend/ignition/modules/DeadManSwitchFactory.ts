import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DeadManSwitchFactory", (m) => {
    const feeRecipient = m.getParameter("feeRecipient");

    const factory = m.contract("DeadManSwitchFactory", [feeRecipient]);

    return { factory };
});
