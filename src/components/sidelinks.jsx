const items = [
  {
    name: "summary",
    title: "Nightly Summary",
    url: "#",
  },
  {
    name: "plots",
    title: "Plots",
    url: "#",
  },
  {
    name: "exposure-log",
    title: "Exposure Log Details",
    url: "#",
  },
  {
    name: "data-log",
    title: "Integrated Data Log",
    url: "#",
  },
];

function SideLinks({ activeKey }) {
  return (
    <>
      {items.map((item) => (
        <div
          key={item.name}
          className={
            item.name === activeKey
              ? "py-2 text-white font-bold text-base"
              : "py-2 text-white font-normal text-base hover:underline underline-offset-2"
          }
        >
          <a href={item.url}>{item.title}</a>
        </div>
      ))}
    </>
  );
}

export default SideLinks;
