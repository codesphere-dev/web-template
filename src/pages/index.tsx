import useCounter from "@/hooks/use-counter";

function App() {
  const { count, increment } = useCounter();

  const handleClick = () => {
    increment();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div>
          <h1 className="text-4xl font-bold capitalize text-center mb-2">
            Counter example
          </h1>
          <h2 className="font-bold text-center">Vite + React + TailwindCSS</h2>
        </div>
        <button
          onClick={handleClick}
          className="cursor-pointer rounded p-2 bg-black text-white hover:bg-gray-800 transition"
        >
          Count is {count}
        </button>
        <span>Edit src/pages/index.tsx to see HMR in action!</span>
      </div>
    </div>
  );
}

export default App;
