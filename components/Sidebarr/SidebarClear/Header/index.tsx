import DarkModeSwitcher from "./DarkModeSwitcher";
import DropdownUser from "./DropdownUser";
import NotificationBell from "./NotificationBell";
import { Menu, X } from "lucide-react";
import appConfig from "@/settings";

const HeaderClear = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
}) => {
  return (
    <header className="sticky top-0 flex w-full bg-gray-100 drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          {/* Logo ou contenu mobile si nécessaire */}
          <button
                onClick={() => props.setMobileOpen?.(!props.mobileOpen)}
                aria-label="Toggle menu"
                className="p-2.5 rounded-xl shadow-lg border border-white/20 hover:opacity-90 transition-all"
                style={{ backgroundColor: appConfig.primaryColor }}
              >
                {props.mobileOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
        </div>

        <div className="hidden sm:block">
          
        </div>

        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            {/* <!-- Hamburger Toggle BTN - Copié depuis la sidebar --> */}
            <li className="md:hidden">
              {/* <button
                onClick={() => props.setMobileOpen?.(!props.mobileOpen)}
                aria-label="Toggle menu"
                className="p-2.5 rounded-xl shadow-lg border border-white/20 hover:opacity-90 transition-all"
                style={{ backgroundColor: appConfig.primaryColor }}
              >
                {props.mobileOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button> */}
            </li>
            {/* <!-- Hamburger Toggle BTN --> */}

            {/* <!-- Dark Mode Toggler --> */}
            <DarkModeSwitcher />
            {/* <!-- Dark Mode Toggler --> */}
          </ul>
          <NotificationBell />
          <DropdownUser />
        </div>
      </div>
    </header>
  );
};

export default HeaderClear;
