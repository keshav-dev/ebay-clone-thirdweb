import { UserCircleIcon } from "@heroicons/react/24/solid";
import { MediaRenderer, useBuyNow, useContract, useListing, useMakeBid, useMakeOffer, useNetwork, useNetworkMismatch, useOffers } from "@thirdweb-dev/react";
import { ChainId, ListingType, NATIVE_TOKENS } from "@thirdweb-dev/sdk";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import Countdown from "react-countdown";
import network from "../../utils/network";
import { ethers } from "ethers";

function ListingPage() {
  const router = useRouter();
  const { listingId } = router.query as { listingId: string };
  const [bidAmount,setBidAmount] = useState("")
  const [,switchNetwork] = useNetwork();
  const networkMismatch = useNetworkMismatch()

  const [minimumNextBid, setMinimumNextBid] = useState<{
    displayValue: string;
    symbol: string;
  }>();

  const { contract } = useContract(
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT,
    "marketplace"
  );
  const { data: listing, isLoading, error } = useListing(contract, listingId);

  const {mutate:buyNow, isLoading:buyLoading, error:buyError} = useBuyNow(contract)
//   const {mutate:makeOffer, isLoading:offerLoading,error:offerError} = useMakeOffer(contract);
  const {data:offers} = useOffers(contract,listingId);
  const {mutate:makeBid, isLoading:bidLoading, error:bidError} = useMakeBid(contract);
  console.log(offers);
  

  useEffect(() => {
    if (!listingId || !listing || !contract) return;
    if (listing.type === ListingType.Auction) {
      fetchMinNextBid();
    }
  }, [listingId, listing, contract]);

  const fetchMinNextBid = async () => {
    if (!listingId || !listing || !contract) return;
    const minBidResponse = await contract.auction.getMinimumNextBid(listingId);
    setMinimumNextBid({
      displayValue: minBidResponse.displayValue,
      symbol: minBidResponse.symbol,
    });
  };

  const formatPlaceholder = () => {
    if (!listing) return "";
    if (listing.type === ListingType.Direct) {
      return "Enter Offer amount";
    }
    if (listing.type == ListingType.Auction) {
      if (!minimumNextBid?.displayValue) {
        return "Enter Bid amount";
      }
      return `${minimumNextBid.displayValue} ${minimumNextBid.symbol} or more`;
    }
  };

  const buyNft = async () => {
    if(networkMismatch){
        switchNetwork && switchNetwork(network);
        return;
    }
    if(!listingId || !listing || !contract)return;
    await buyNow({
        id:listingId,
        buyAmount: 1,
        type: listing.type,
    },{
        onSuccess(data, variables, context){
            alert("NFT bought successfully")
            console.log("SUCCESS: ",data);
            router.replace('/')
        },
        onError(error, variables, context) {
            alert("ERROR: NFT could not be bought")
            console.error(error,variables,context);
        },
    })
  }

  const createBidOrOffer = async() => {
    try {
        if(networkMismatch){
            switchNetwork && switchNetwork(network);
            return;
        }
        // Direct Listing
        if(listing?.type === ListingType.Direct) {
            if(Number(bidAmount) >= Number(listing.buyoutCurrencyValuePerToken.displayValue)){
                console.log("Buying...")
                buyNft();
                return;
            }
            console.log("creating offer")
            const currencyContractAddress = NATIVE_TOKENS[ChainId.Mumbai].wrapped.address
            await contract?.direct.makeOffer(listingId,1,currencyContractAddress,bidAmount);
            console.log("Offer created")
        }

        //Auction Listing
        if(listing?.type === ListingType.Auction) {
            console.log("Makeing Bid")
            await makeBid({
                listingId:listingId,
                bid:bidAmount
            },{
                onSuccess(data, variables, context){
                    alert("Bid successfully")
                    console.log("SUCCESS: ",data, variables, context);
                    setBidAmount('')
                },
                onError(error, variables, context) {
                    alert("ERROR: Bid could not be made")
                    console.error("ERROR: ",error,variables,context);
                }
            })
        }
    } catch (error) {
        console.error(error)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="text-center animate-blue text-blue-500">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div>
        <Header />
        No listing found
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="max-w-6xl mx-auto p-2 flex flex-col lg:flex-row space-y-10 space-x-5 pr-10">
        <div className="p-10 border mx-auto lg:mx-0 max-w-md lg:max-w-xl">
          <MediaRenderer src={listing?.asset.image}></MediaRenderer>
        </div>
        <section className="flex-1 space-y-5 pb-20 lg:pb-0">
          <div>
            <h1 className="text-xl font-bold">{listing.asset.name}</h1>
            <p className="text-gray-600 ">{listing.asset.description}</p>
            <p className="flex items-center text-xs sm:text-base spaec-x-4">
              <UserCircleIcon className="h-5 " />
              <span className="font-bold pr-1">Seller: </span>
              {listing.sellerAddress}
            </p>
          </div>

          <div className="grid grid-cols-2 items-center p-2">
            <p className="font-bold">Listing Type:</p>
            <p>
              {listing.type === ListingType.Direct
                ? "Direct Listing"
                : "Auction Listing"}
            </p>
            <p className="font-bold">Buy it now Price:</p>
            <p className="text-4xl font-bold">
              {listing.buyoutCurrencyValuePerToken.displayValue}{" "}
              {listing.buyoutCurrencyValuePerToken.symbol}
            </p>
            <button className="col-start-2 mt-2 bg-blue-600 font-bold text-white rounded-full w-44 py-4 px-10" onClick={buyNft}>
              Buy Now
            </button>
          </div>

          <div className="grid grid-cols-2 space-y-2 items-center justify-end ">
            <hr className="col-span-2" />
            <p className="col-span-2 font-bold">
              {listing.type === ListingType.Direct
                ? "Make an offer"
                : "Bid on this Auction"}
            </p>
            {listing.type === ListingType.Auction && (
              <>
                <p>Current Minimum Bid:</p>
                <p className="font-bold">
                  {minimumNextBid?.displayValue} {minimumNextBid?.symbol}
                </p>
                <p>Time Remaining:</p>
                <Countdown
                  date={Number(listing.endTimeInEpochSeconds.toString()) * 1000}
                />
              </>
            )}
            <input
              className="border-2 border-black p-2 rounded-lg mr-5 outline-none"
              type="text"
              placeholder={formatPlaceholder()}
              onChange={e=>setBidAmount(e.target.value)}
            />
            <button onClick={createBidOrOffer} className="bg-red-600 font-bold text-white rounded-full w-44 py-4 px-10">
              {listing.type === ListingType.Direct ? "Offer" : "Bid"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ListingPage;
