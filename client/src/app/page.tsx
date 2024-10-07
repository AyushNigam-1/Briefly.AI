import Image from "next/image";
import loader from "../../public/805.svg"
export default function Home() {
  return (
   <div className="h-screen w-screen flex justify-center items-center">
    <div className="flex flex-col gap-10 w-[800px]">
      <h3 className="text-gray-100 font-bold font-mono text-4xl">Get Instant Summarization Of Youtube Videos & Websites</h3>
      <div className="flex" >
          <input type="text" className="bg-gray-700 py-4 w-full rounded-s-full pl-6 outline-none" placeholder="e.g https://youtu.be/IHkGe92LG_A?si=cjovoaz-goQNn00Y or https://heroicons.com/ " />
      <span className=" pr-10 bg-gray-700 rounded-e-full flex gap-2 items-center " >
        <Image src={loader} alt="loader" width="20" height="20"></Image>
        <p className="font-mono text-gray-400" >Verifying</p>
      </span>
      </div>
        <button className="bg-gray-800 w-min flex items-center gap-1 text-2xl font-mono p-2 px-3 rounded-full" >Summarize <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
        </svg>
</button>
    </div>

   </div>

  );
}
