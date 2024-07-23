// pages/index.tsx

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { FAUCET_ABI, FAUCET_ADDRESS } from '../utils/contract';
import { createPublicClient, formatUnits, http, parseEther } from 'viem';
import { sepolia } from 'wagmi/chains';

export default function Home() {
  const { address, isConnected } = useAccount();
  const [lastWithdrawTime, setLastWithdrawTime] = useState<number | null>(null);
  const [contributors, setContributors] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [fundAmount, setFundAmount] = useState('0');
  const [leaderBoardOBJ, setLeaderBoardOBJ] = useState<any>([]);
  const [username, setUsername] = useState('');
  const [faucetBalance, setFaucetBalance] = useState('0');
  const [isUsernameSet, setIsUsernameSet] = useState(false);

  const client = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  const { writeContract: requestTokensWrite } = useWriteContract();
  const { writeContract: fundFaucetWrite } = useWriteContract();
  const { writeContract: setUsernameWrite } = useWriteContract();

  const { data: contributorsData }: any = useReadContract({
    address: FAUCET_ADDRESS,
    abi: FAUCET_ABI,
    functionName: 'getContributors',
  });

  const { data: lastWithdrawData }: any = useReadContract({
    address: FAUCET_ADDRESS,
    abi: FAUCET_ABI,
    functionName: 'lastWithdrawTime',
    args: [address],
  });

  const { data: faucetBalanceData }: any = useReadContract({
    address: FAUCET_ADDRESS,
    abi: FAUCET_ABI,
    functionName: 'getBalance',
  });

  const { data: usernameData }: any = useReadContract({
    address: FAUCET_ADDRESS,
    abi: FAUCET_ABI,
    functionName: 'getUsername',
    args: [address],
  });

  useEffect(() => {
    if (isConnected) {
      fetchContributors();
      fetchLastWithdrawTime();
      fetchFaucetBalance();
      fetchUsername();
      getLeaderBoard();
    }
  }, [isConnected, contributorsData, lastWithdrawData, faucetBalanceData, usernameData]);

  useEffect(() => {
    if (usernameData && usernameData !== '') {
      setIsUsernameSet(true);
      setUsername(usernameData);
    }
  }, [usernameData]);

  async function fetchContributors() {
    if (contributorsData) {
      const contributions = await Promise.all(contributorsData.map(async (addr: string) => {
        const contribution = await client.readContract({
          address: FAUCET_ADDRESS,
          abi: FAUCET_ABI,
          functionName: 'contributions',
          args: [addr],
        });
        return { address: addr, contribution };
      }));
      setContributors(contributions);
    }
  }

  async function fetchLastWithdrawTime() {
    if (lastWithdrawData) {
      setLastWithdrawTime(lastWithdrawData.toNumber());
    }
  }

  async function fetchFaucetBalance() {
    if (faucetBalanceData) {
      setFaucetBalance(formatUnits(faucetBalanceData, 18));
    }
  }

  async function fetchUsername() {
    if (usernameData) {
      setUsername(usernameData);
      setIsUsernameSet(true);
    } else {
      setIsUsernameSet(false);
    }
  }

  const getLeaderBoard = async () => {
    if (contributorsData) {
      const leaderBoard = await Promise.all(contributorsData.map(async (addr: string) => {
        const contribution: any = await client.readContract({
          address: FAUCET_ADDRESS,
          abi: FAUCET_ABI,
          functionName: 'contributions',
          args: [addr],
        });
        const username: any = await client.readContract({
          address: FAUCET_ADDRESS,
          abi: FAUCET_ABI,
          functionName: 'getUsername',
          args: [addr],
        });
        return { address: addr, username, contribution: formatUnits(contribution, 18) };
      }));
      leaderBoard.sort((a, b) => parseFloat(b.contribution) - parseFloat(a.contribution));
      setLeaderBoardOBJ(leaderBoard);
    }
  }

  const handleRequestTokens = async () => {
    if(lastWithdrawTime && lastWithdrawTime > 0) {
      const timeSinceLastWithdraw = (Date.now() / 1000) - lastWithdrawTime;
      if (timeSinceLastWithdraw < 60) {
        alert(`You can request tokens again in ${60 - timeSinceLastWithdraw} seconds`);
        return;
      }
    }
    if(!isUsernameSet) {
      alert('Please set your username first');
      return;
    }
    if (Number(faucetBalance) < 0.005) {
      alert('Faucet is out of funds');
      return;
    }
    alert('Requesting tokens');
    try {
      setLoading(true);
      await requestTokensWrite({
        address: FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'requestTokens',
      }, {
        onSuccess: () => {
          setLoading(false);
          window.location.reload();
        },
        onError: (error) => {
          console.error(error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  const handleFundFaucet = async () => {
    alert('Funding the faucet');
    try {
      setLoading(true);
      await fundFaucetWrite({
        address: FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'fundFaucet',
        value: parseEther(fundAmount),
      }, {
        onSuccess: () => {
          setLoading(false);
          window.location.reload();
        },
        onError: (error) => {
          console.error(error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  const handleSetUsername = async () => {
    alert('Setting username');
    try {
      setLoading(true);
      await setUsernameWrite({
        address: FAUCET_ADDRESS,
        abi: FAUCET_ABI,
        functionName: 'setUsername',
        args: [username],
      }, {
        onSuccess: () => {
          setLoading(false);
          window.location.reload();
        },
        onError: (error) => {
          console.error(error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  const emojiMap = ['🥇', '🥈', '🥉', '🏅', '🏅'];

  return (
    <div className="min-h-screen bg-peach text-white flex flex-col items-center">
      <header className="w-full bg-gray-900 p-4 flex justify-between items-center">
        <h1 className="text-4xl font-bold">Stackup Faucet</h1>
        <ConnectButton />
      </header>
      <main className="flex flex-col items-center p-4 w-full max-w-2xl">
        {isConnected ? (
          <div className="bg-white text-black p-6 rounded-lg shadow-lg w-full">
            <h2 className="text-2xl font-semibold mb-4">Welcome, {username || address}</h2>
            <p className="mb-4">Faucet Balance: {faucetBalance} ETH</p>
            {!isUsernameSet ? (
              <>
                <input
                  type="text"
                  placeholder="Enter your Stackup username"
                  className="text-black border border-gray-300 rounded-lg p-2 w-full mb-4"
                  onChange={(e) => setUsername(e.target.value)}
                />
                <button
                  onClick={handleSetUsername}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg mb-4 w-full cursor-pointer"
                  disabled={loading}
                >
                  Set Username
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={handleRequestTokens} 
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg mb-4 w-full cursor-pointer"
                >
                  {loading ? 'Requesting...' : 'Request Tokens'}
                </button>
                <input
                  type="text"
                  placeholder="Amount to fund"
                  className="text-black border border-gray-300 rounded-lg p-2 w-full mb-4"
                  onChange={(e) => setFundAmount(e.target.value)}
                />
                <button
                  onClick={handleFundFaucet}
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg mb-4 w-full cursor-pointer"
                >
                  {loading ? 'Funding...' : 'Fund Faucet'}
                </button>
                <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
                <ul className="list-none p-0">
                  {leaderBoardOBJ.map((contributor: any, index: number) => (
                    <li key={contributor.address} className="flex items-center justify-between py-2 px-4 bg-gray-100 mb-2 rounded-lg shadow-sm">
                      <span className="font-bold">{emojiMap[index] || ''} {contributor.username}</span>
                      <span className="text-gray-700">{contributor.contribution} ETH</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-black text-center p-8 bg-white rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-4">Holla, This is Stackup Faucet</h2>
            <p className="text-lg mb-4">Request Sepolia testnet tokens every 24 hours and help others by funding the faucet. Connect your wallet to get started!</p>
            <ConnectButton  />
            <img src="/illus.png" alt="Faucet Illustration" className="mt-8 w-64" />
          </div>
        )}
      </main>
    </div>
  );
}
