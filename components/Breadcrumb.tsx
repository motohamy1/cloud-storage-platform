import Link from "next/link";

const Breadcrumb = ({ trail }: { trail: { $id: string; name: string }[] }) => {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link href="/folders" className="body-2 text-brand hover:underline">
        My files
      </Link>

      {trail.map((item, index) => {
        const isLast = index === trail.length - 1;

        return (
          <span key={item.$id} className="flex items-center gap-2">
            <span className="caption text-light-200">/</span>
            {isLast ? (
              <span className="body-2 text-light-100">{item.name}</span>
            ) : (
              <Link
                href={`/folders/${item.$id}`}
                className="body-2 text-brand hover:underline"
              >
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
