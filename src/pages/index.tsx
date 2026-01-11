import { Button } from "@/components/ui/button";
import { useCounterStore } from "@/store";
// import useCounter from "@/hooks/use-counter";

function Home() {
  const { count, increment, reset } = useCounterStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div>
          <h1 className="text-4xl font-bold capitalize text-center mb-2">
            Counter example
          </h1>
          <h2 className="font-bold text-center">Vite + React + TailwindCSS</h2>
        </div>
        <div className="flex gap-4">
          <Button onClick={increment}>Count is {count}</Button>
          <Button onClick={reset}>Reset</Button>
        </div>
        <span>Edit src/pages/index.tsx to see HMR in action!</span>
      </div>
    </div>
  );
}

export default Home;
