import React, { createContext, useEffect, useState } from "react";
import Pact from "pact-lang-api";
import swal from "@sweetalert/with-react";
import { getCorrectBalance } from "../utils/reduceBalance";
import {
  chainId,
  creationTime,
  GAS_PRICE,
  network,
} from "../constants/contextConstants";

export const AccountContext = createContext();

const savedAcct = localStorage.getItem("acct");
const savedPrivKey = localStorage.getItem("pk");
const savedSigning = localStorage.getItem("signing");

export const AccountProvider = (props) => {
  const [sendRes, setSendRes] = useState(null);
  const [account, setAccount] = useState(
    savedAcct
      ? JSON.parse(savedAcct)
      : { account: null, guard: null, balance: 0 }
  );
  const [privKey, setPrivKey] = useState(savedPrivKey ? savedPrivKey : "");

  const [registered, setRegistered] = useState(false);

  const [tokenFromAccount, setTokenFromAccount] = useState({
    account: null,
    guard: null,
    balance: 0,
  });
  const [tokenToAccount, setTokenToAccount] = useState({
    account: null,
    guard: null,
    balance: 0,
  });
  const [totalSupply, setTotalSupply] = useState("");

  useEffect(() => {
    if (account.account) setVerifiedAccount(account.account);
  }, [sendRes]);

  useEffect(() => {
    if (account.account) setRegistered(true);
  }, [registered]);

  const clearSendRes = () => {
    setVerifiedAccount(account.account);
    setSendRes(null);
  };

  const setVerifiedAccount = async (accountName) => {
    /* console.log("network", network); */

    try {
      let data = await Pact.fetch.local(
        {
          pactCode: `(coin.details ${JSON.stringify(accountName)})`,
          meta: Pact.lang.mkMeta(
            "",
            chainId,
            GAS_PRICE,
            3000,
            creationTime(),
            600
          ),
        },
        network
      );
      if (data.result.status === "success") {
        await localStorage.setItem("acct", JSON.stringify(data.result.data));
        setAccount({
          ...data.result.data,
          balance: getCorrectBalance(data.result.data.balance),
        });
        await localStorage.setItem("acct", JSON.stringify(data.result.data));
      } else {
        await swal({
          text: `Please make sure the account ${accountName} exist on kadena blockchain`,
          title: "No Account",
        });
        setAccount({ account: null, guard: null, balance: 0 });
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getTokenAccount = async (token, account, first) => {
    try {
      let data = await Pact.fetch.local(
        {
          pactCode: `(${token}.details ${JSON.stringify(account)})`,
          keyPairs: Pact.crypto.genKeyPair(),
          meta: Pact.lang.mkMeta(
            "",
            chainId,
            0.01,
            100000000,
            28800,
            creationTime()
          ),
        },
        network
      );
      if (data.result.status === "success") {
        // setTokenAccount({...data.result.data, balance: getCorrectBalance(data.result.data.balance)});
        first
          ? setTokenFromAccount(data.result.data)
          : setTokenToAccount(data.result.data);
        return data.result.data;
      } else if (data.result.status === "failure") {
        first
          ? setTokenFromAccount({ account: null, guard: null, balance: 0 })
          : setTokenToAccount({ account: null, guard: null, balance: 0 });
        return { account: null, guard: null, balance: 0 };
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getTotalTokenSupply = async (token0, token1) => {
    try {
      let data = await Pact.fetch.local(
        {
          pactCode: `(kswap.tokens.total-supply (kswap.exchange.get-pair-key ${token0} ${token1}))`,
          keyPairs: Pact.crypto.genKeyPair(),
          meta: Pact.lang.mkMeta(
            "",
            chainId,
            0.01,
            100000000,
            28800,
            creationTime()
          ),
        },
        network
      );
      if (data.result.status === "success") {
        if (data.result.data.decimal) setTotalSupply(data.result.data.decimal);
        else setTotalSupply(data.result.data);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const logout = () => {
    localStorage.removeItem("acct", null);
    localStorage.removeItem("signing", null);
    localStorage.removeItem("pk");
    window.location.reload();
  };

  const contextValues = {
    GAS_PRICE,
    account,
    privKey,
    setPrivKey,
    clearSendRes,
    sendRes,
    setVerifiedAccount,
    registered,
    setRegistered,
    getTokenAccount,
    tokenToAccount,
    tokenFromAccount,
    getTotalTokenSupply,
    totalSupply,
    logout,
  };
  return (
    <AccountContext.Provider value={contextValues}>
      {props.children}
    </AccountContext.Provider>
  );
};

export const AccountConsumer = AccountContext.Consumer;
