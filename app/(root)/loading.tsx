const Loading = () => {
  return (
    <div className="dashboard-container">
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-light-400" />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[180px] animate-pulse rounded-xl bg-light-400"
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-xl bg-light-400"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loading;
