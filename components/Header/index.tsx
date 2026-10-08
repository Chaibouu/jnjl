import Link from "next/link";
import DarkModeSwitcher from "./DarkModeSwitcher";
import DropdownUser from "./DropdownUser";
import Image from "next/image";
import appConfig from "@/settings";

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  return (
    <header className="sticky top-0 z-999 flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        {/* Logo mobile - aligné à gauche */}
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          <Link className="block flex-shrink-0" href="/">
            <Image
              width={100}
              height={32}
              src={`${appConfig.logoUrl}`}
              alt={`${appConfig.appName}`}
            />
          </Link>
        </div>

        <div className="hidden sm:block">
          
        </div>

        {/* Actions à droite - bouton burger aligné avec mode sombre */}
        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            {/* <!-- Hamburger Toggle BTN - Aligné avec les autres boutons --> */}
            <li className="lg:hidden">
              <button
                aria-controls="sidebar"
                onClick={(e) => {
                  e.stopPropagation();
                  props.setSidebarOpen(!props.sidebarOpen);
                }}
                className="relative flex h-7.5 w-7.5 items-center justify-center rounded-sm border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <span className="relative block h-4 w-4 cursor-pointer">
                  <span className="du-block absolute right-0 h-full w-full">
                    <span
                      className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black transition-all duration-200 ease-in-out dark:bg-white ${
                        !props.sidebarOpen && "!w-full delay-300"
                      }`}
                    ></span>
                    <span
                      className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black transition-all delay-150 duration-200 ease-in-out dark:bg-white ${
                        !props.sidebarOpen && "delay-400 !w-full"
                      }`}
                    ></span>
                    <span
                      className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black transition-all delay-200 duration-200 ease-in-out dark:bg-white ${
                        !props.sidebarOpen && "!w-full delay-500"
                      }`}
                    ></span>
                  </span>
                  <span className="absolute right-0 h-full w-full rotate-45">
                    <span
                      className={`absolute left-1.5 top-0 block h-full w-0.5 rounded-sm bg-black transition-all delay-300 duration-200 ease-in-out dark:bg-white ${
                        !props.sidebarOpen && "!h-0 !delay-0"
                      }`}
                    ></span>
                    <span
                      className={`absolute left-0 top-1.5 block h-0.5 w-full rounded-sm bg-black transition-all delay-400 duration-200 ease-in-out dark:bg-white ${
                        !props.sidebarOpen && "!h-0 !delay-200"
                      }`}
                    ></span>
                  </span>
                </span>
              </button>
            </li>
            {/* <!-- Hamburger Toggle BTN --> */}

            {/* <!-- Dark Mode Toggler --> */}
            <DarkModeSwitcher />
            {/* <!-- Dark Mode Toggler --> */}

            {/* <!-- Notification Menu Area --> */}
            {/* <DropdownNotification /> */}
            {/* <!-- Notification Menu Area --> */}

            {/* <!-- Chat Notification Area --> */}
            {/* <DropdownMessage /> */}
            {/* <!-- Chat Notification Area --> */}
          </ul>

          {/* <!-- User Area --> */}
          <DropdownUser />
          {/* <!-- User Area --> */}
        </div>
      </div>
    </header>
  );
};

export default Header;
