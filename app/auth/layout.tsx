import charter from "@/settings/charter";

const AuthLayout = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{ backgroundColor: charter.bg }}
    >
      <div
        className="pointer-events-none fixed -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `${charter.orange}22` }}
      />
      <div
        className="pointer-events-none fixed -right-20 -bottom-24 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: `${charter.gold}30` }}
      />
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
